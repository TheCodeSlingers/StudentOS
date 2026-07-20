import { randomUUID } from "crypto";
import { StudentService } from "./student.service";
import { prisma } from "../../lib/prisma";
import { BadRequestError } from "../../common/errors";

describe("StudentService", () => {
  jest.setTimeout(30000);
  let workspaceId: string;
  let studentUserId: string;
  let studentMembershipId: string;
  let batchId: string;
  let batchMembershipId: string;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const ws = await prisma.workspace.create({
      data: {
        name: `Student Service Test Workspace ${suffix}`,
        settings: {
          create: {
            defaultAttendanceDurationMins: 15,
            lateThresholdMins: 10,
          },
        },
      },
    });
    workspaceId = ws.id;

    const student = await prisma.user.create({
      data: { email: `student-service-test-${suffix}@example.com`, name: "Sam Enrollee" },
    });
    studentUserId = student.id;

    const membership = await prisma.membership.create({
      data: {
        userId: studentUserId,
        workspaceId,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    studentMembershipId = membership.id;

    const batch = await prisma.batch.create({
      data: {
        workspaceId,
        name: "Enrollment Test Batch",
        startDate: new Date(),
      },
    });
    batchId = batch.id;
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.batchMembership.deleteMany({ where: { batchId } }),
      prisma.batch.deleteMany({ where: { workspaceId } }),
      prisma.membership.deleteMany({ where: { id: studentMembershipId } }),
      prisma.workspace.deleteMany({ where: { id: workspaceId } }),
      prisma.user.deleteMany({ where: { id: studentUserId } }),
    ]);
  });

  describe("enrollStudentIntoDB", () => {
    it("returns the flat enrollment shape the frontend expects, with real user info", async () => {
      const enrollment = await StudentService.enrollStudentIntoDB(batchId, studentMembershipId, true);

      expect(enrollment.batchMembershipId).toBeDefined();
      expect(enrollment.membershipId).toBe(studentMembershipId);
      expect(enrollment.userId).toBe(studentUserId);
      expect(enrollment.name).toBe("Sam Enrollee");
      expect(enrollment.email).toMatch(/student-service-test-/);
      expect(enrollment.isCR).toBe(true);

      batchMembershipId = enrollment.batchMembershipId;
    });

    it("throws BadRequestError when the student is already actively enrolled", async () => {
      await expect(StudentService.enrollStudentIntoDB(batchId, studentMembershipId)).rejects.toThrow(
        BadRequestError
      );
    });

    it("re-enrolls a previously revoked student and refreshes their CR flag", async () => {
      await StudentService.revokeEnrollmentIntoDB(batchId, batchMembershipId);

      const reEnrolled = await StudentService.enrollStudentIntoDB(batchId, studentMembershipId, false);
      expect(reEnrolled.membershipId).toBe(studentMembershipId);
      expect(reEnrolled.isCR).toBe(false);
      expect(reEnrolled.name).toBe("Sam Enrollee");
    });
  });

  describe("getEnrolledStudentsFromDB", () => {
    it("returns the roster with real name/email at the top level, not nested under membership", async () => {
      const result = await StudentService.getEnrolledStudentsFromDB(batchId);

      expect(result.data.length).toBe(1);
      const [row] = result.data;
      expect(row.batchMembershipId).toBeDefined();
      expect(row.name).toBe("Sam Enrollee");
      expect(row.email).toMatch(/student-service-test-/);
      expect((row as any).membership).toBeUndefined();
    });
  });
});
