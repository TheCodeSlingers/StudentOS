jest.setTimeout(30000);
import { BatchService } from "./batch.service";
import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../common/errors";

describe("BatchService", () => {
  let workspaceId: string;
  let mentorUserId: string;
  let mentorMembershipId: string;
  let studentUserId: string;
  let studentMembershipId: string;
  let batchId: string;
  let batchMembershipId: string;

  beforeAll(async () => {
    const ws = await prisma.workspace.create({
      data: {
        name: "Batch Test Workspace",
        settings: {
          create: {
            defaultAttendanceDurationMins: 15,
            lateThresholdMins: 10,
          },
        },
      },
    });
    workspaceId = ws.id;

    const mentor = await prisma.user.create({
      data: { email: "batch-mentor@example.com", name: "Batch Mentor" },
    });
    mentorUserId = mentor.id;

    const mMem = await prisma.membership.create({
      data: {
        userId: mentorUserId,
        workspaceId,
        role: "MENTOR",
        status: "ACTIVE",
      },
    });
    mentorMembershipId = mMem.id;

    const student = await prisma.user.create({
      data: { email: "batch-student@example.com", name: "Batch Student" },
    });
    studentUserId = student.id;

    const sMem = await prisma.membership.create({
      data: {
        userId: studentUserId,
        workspaceId,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    studentMembershipId = sMem.id;
  });

  afterAll(async () => {
    const idsToDelete = [batchMembershipId].filter(Boolean);

    await prisma.$transaction(
      [
        prisma.batchMembership.deleteMany({
          where: { id: { in: idsToDelete } },
        }),
        prisma.batch.deleteMany({
          where: { workspaceId },
        }),
        prisma.membership.deleteMany({
          where: { id: { in: [mentorMembershipId, studentMembershipId] } },
        }),
        prisma.workspace.deleteMany({
          where: { id: workspaceId },
        }),
        prisma.user.deleteMany({
          where: {
            email: {
              in: ["batch-mentor@example.com", "batch-student@example.com"],
            },
          },
        }),
      ],
      { timeout: 30000 },
    );
  });

  describe("createBatch", () => {
    it("should successfully create a new batch in the workspace", async () => {
      const batch = await BatchService.createBatchIntoDB(workspaceId, {
        name: "Cohort 1",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lateThresholdMinsOverride: 15,
        attendanceDurationMinsOverride: 20,
      });

      expect(batch).toBeDefined();
      expect(batch.name).toBe("Cohort 1");
      expect(batch.workspaceId).toBe(workspaceId);
      batchId = batch.id;
    });
  });

  describe("listBatches", () => {
    it("should list active batches within the workspace", async () => {
      const list = await BatchService.getListBatchesFromDB(workspaceId);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(batchId);
    });
  });

  describe("getBatch", () => {
    it("should return detailed batch info including metrics", async () => {
      const details = await BatchService.getBatchFromDB(workspaceId, batchId);
      expect(details).toBeDefined();
      expect(details.id).toBe(batchId);
      expect(details.metrics.totalStudents).toBe(0);
      expect(details.metrics.totalSessions).toBe(0);
    });

    it("should throw NotFoundError if batch does not exist", async () => {
      await expect(
        BatchService.getBatchFromDB(workspaceId, "non-existent-batch"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateBatch", () => {
    it("should update batch details successfully", async () => {
      const updated = await BatchService.updateBatchIntoDB(workspaceId, batchId, {
        name: "Cohort 1 - Updated",
        lateThresholdMinsOverride: 5,
      });

      expect(updated.name).toBe("Cohort 1 - Updated");
      expect(updated.lateThresholdMinsOverride).toBe(5);
    });
  });

  describe("allocateMember", () => {
    it("should successfully allocate a workspace member to the batch", async () => {
      const allocation = await BatchService.allocateMemberIntoDB(
        workspaceId,
        batchId,
        {
          membershipId: studentMembershipId,
          isCR: false,
        },
      );

      expect(allocation).toBeDefined();
      expect(allocation.batchId).toBe(batchId);
      expect(allocation.membershipId).toBe(studentMembershipId);
      batchMembershipId = allocation.id;
    });

    it("should throw BadRequestError if member is already active in batch", async () => {
      await expect(
        BatchService.allocateMemberIntoDB(workspaceId, batchId, {
          membershipId: studentMembershipId,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw NotFoundError if membership is not found or inactive", async () => {
      await expect(
        BatchService.allocateMemberIntoDB(workspaceId, batchId, {
          membershipId: "non-existent-mem",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listBatchMembers", () => {
    it("should return all active batch members roster", async () => {
      const roster = await BatchService.getListBatchMembersFromDB(workspaceId, batchId);
      expect(roster.length).toBe(1);
      expect(roster[0].membershipId).toBe(studentMembershipId);
      expect(roster[0].role).toBe("STUDENT");
    });

    it("should filter batch members roster by role", async () => {
      const students = await BatchService.getListBatchMembersFromDB(
        workspaceId,
        batchId,
        "STUDENT",
      );
      expect(students.length).toBe(1);

      const mentors = await BatchService.getListBatchMembersFromDB(
        workspaceId,
        batchId,
        "MENTOR",
      );
      expect(mentors.length).toBe(0);
    });
  });

  describe("updateBatchMembership", () => {
    it("should update student CR flag successfully", async () => {
      const updated = await BatchService.updateBatchMembershipIntoDB(
        workspaceId,
        batchId,
        batchMembershipId,
        {
          isCR: true,
        },
      );
      expect(updated.isCR).toBe(true);
    });

    it("should revoke student enrollment successfully", async () => {
      const revokedAtDate = new Date().toISOString();
      const updated = await BatchService.updateBatchMembershipIntoDB(
        workspaceId,
        batchId,
        batchMembershipId,
        {
          revokedAt: revokedAtDate,
        },
      );
      expect(updated.revokedAt).not.toBeNull();

      const roster = await BatchService.getListBatchMembersFromDB(workspaceId, batchId);
      expect(roster.length).toBe(0);
    });
  });

  describe("archiveBatch", () => {
    it("should toggle batch archived status successfully", async () => {
      const archived = await BatchService.archiveBatchIntoDB(workspaceId, batchId);
      expect(archived.isArchived).toBe(true);

      const list = await BatchService.getListBatchesFromDB(workspaceId);
      expect(list.length).toBe(0);
    });
  });

  describe("listBatches status filter", () => {
    it("defaults to only active batches", async () => {
      const list = await BatchService.getListBatchesFromDB(workspaceId);
      expect(list.length).toBe(0);
    });

    it("returns only archived batches when status is 'archived'", async () => {
      const list = await BatchService.getListBatchesFromDB(workspaceId, "archived");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(batchId);
    });

    it("returns every batch regardless of archived status when status is 'all'", async () => {
      const list = await BatchService.getListBatchesFromDB(workspaceId, "all");
      expect(list.length).toBe(1);
    });
  });
});
