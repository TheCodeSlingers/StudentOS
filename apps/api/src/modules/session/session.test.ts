import { SessionService } from "./session.service";
import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../common/errors";

describe("SessionService", () => {
  let workspaceId: string;
  let mentorUserId: string;
  let mentorMembershipId: string;
  let studentUserId: string;
  let studentMembershipId: string;
  let batchId: string;
  let batchMembershipId: string;
  let sessionId: string;

  beforeAll(async () => {
    const ws = await prisma.workspace.create({
      data: {
        name: "Session Test Workspace",
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
      data: { email: "session-mentor@example.com", name: "Session Mentor" },
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
      data: { email: "session-student@example.com", name: "Session Student" },
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

    const batch = await prisma.batch.create({
      data: {
        workspaceId,
        name: "Session Test Batch",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      },
    });
    batchId = batch.id;

    const bMem = await prisma.batchMembership.create({
      data: {
        batchId,
        membershipId: studentMembershipId,
        isCR: false,
      },
    });
    batchMembershipId = bMem.id;
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { session: { batchId } } }),
      prisma.session.deleteMany({ where: { batchId } }),
      prisma.batchMembership.deleteMany({ where: { id: batchMembershipId } }),
      prisma.batch.deleteMany({ where: { id: batchId } }),
      prisma.membership.deleteMany({ where: { id: { in: [mentorMembershipId, studentMembershipId] } } }),
      prisma.workspace.deleteMany({ where: { id: workspaceId } }),
      prisma.user.deleteMany({ where: { email: { in: ["session-mentor@example.com", "session-student@example.com"] } } }),
    ]);
  });

  describe("createSession", () => {
    it("should create a session successfully", async () => {
      const session = await SessionService.createSession(batchId, workspaceId, {
        title: "Module 1: Intro",
        scheduledStart: new Date("2026-07-14T20:00:00Z").toISOString(),
        scheduledEnd: new Date("2026-07-14T21:00:00Z").toISOString(),
        meetLink: "https://meet.google.com/abc-defg-hij",
        description: "Introduction session",
        type: "REGULAR",
      });

      expect(session).toBeDefined();
      expect(session.title).toBe("Module 1: Intro");
      expect(session.status).toBe("SCHEDULED");
      expect(session.batchId).toBe(batchId);
      sessionId = session.id;
    });

    it("should throw NotFoundError if batch does not exist", async () => {
      await expect(
        SessionService.createSession("non-existent-batch", workspaceId, {
          title: "Test",
          scheduledStart: new Date("2026-07-14T20:00:00Z").toISOString(),
          scheduledEnd: new Date("2026-07-14T21:00:00Z").toISOString(),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if batch belongs to another workspace", async () => {
      const otherWs = await prisma.workspace.create({
        data: {
          name: "Other Workspace",
          settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
        },
      });

      await expect(
        SessionService.createSession(batchId, otherWs.id, {
          title: "Test",
          scheduledStart: new Date("2026-07-14T20:00:00Z").toISOString(),
          scheduledEnd: new Date("2026-07-14T21:00:00Z").toISOString(),
        })
      ).rejects.toThrow(ForbiddenError);

      await prisma.workspace.delete({ where: { id: otherWs.id } });
    });

    it("should throw BadRequestError if batch is archived", async () => {
      await prisma.batch.update({ where: { id: batchId }, data: { isArchived: true } });

      await expect(
        SessionService.createSession(batchId, workspaceId, {
          title: "Archived Batch Session",
          scheduledStart: new Date("2026-07-14T20:00:00Z").toISOString(),
          scheduledEnd: new Date("2026-07-14T21:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);

      await prisma.batch.update({ where: { id: batchId }, data: { isArchived: false } });
    });

    it("should throw BadRequestError if end time is before start time", async () => {
      await expect(
        SessionService.createSession(batchId, workspaceId, {
          title: "Bad Times",
          scheduledStart: new Date("2026-07-14T21:00:00Z").toISOString(),
          scheduledEnd: new Date("2026-07-14T20:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if session starts before batch start date", async () => {
      await expect(
        SessionService.createSession(batchId, workspaceId, {
          title: "Too Early",
          scheduledStart: new Date("2025-01-01T00:00:00Z").toISOString(),
          scheduledEnd: new Date("2025-01-01T01:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if session ends after batch end date", async () => {
      await expect(
        SessionService.createSession(batchId, workspaceId, {
          title: "Too Late",
          scheduledStart: new Date("2027-01-01T00:00:00Z").toISOString(),
          scheduledEnd: new Date("2027-01-01T01:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("listSessions", () => {
    it("should list sessions for mentor", async () => {
      const result = await SessionService.listSessions(
        batchId, workspaceId, mentorMembershipId, "MENTOR"
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.meta.page).toBe(1);
    });

    it("should list sessions for enrolled student", async () => {
      const result = await SessionService.listSessions(
        batchId, workspaceId, studentMembershipId, "STUDENT"
      );

      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should throw ForbiddenError for unenrolled student", async () => {
      const otherBatch = await prisma.batch.create({
        data: {
          workspaceId,
          name: "Other Batch",
          startDate: new Date("2026-01-01"),
        },
      });

      await expect(
        SessionService.listSessions(
          otherBatch.id, workspaceId, studentMembershipId, "STUDENT"
        )
      ).rejects.toThrow(ForbiddenError);

      await prisma.batch.delete({ where: { id: otherBatch.id } });
    });

    it("should filter by status", async () => {
      const result = await SessionService.listSessions(
        batchId, workspaceId, mentorMembershipId, "MENTOR", 1, 20, "SCHEDULED"
      );

      expect(result.data.every((s: any) => s.status === "SCHEDULED")).toBe(true);
    });

    it("should throw NotFoundError for non-existent batch", async () => {
      await expect(
        SessionService.listSessions("fake-batch", workspaceId, mentorMembershipId, "MENTOR")
      ).rejects.toThrow(NotFoundError);
    });

    it("should support cursor-based pagination", async () => {
      const firstPage = await SessionService.listSessions(
        batchId, workspaceId, mentorMembershipId, "MENTOR", 1, 1
      );

      expect(firstPage.data.length).toBeLessThanOrEqual(1);

      if (firstPage.meta.nextCursor) {
        const secondPage = await SessionService.listSessions(
          batchId, workspaceId, mentorMembershipId, "MENTOR", 1, 1, undefined, firstPage.meta.nextCursor
        );

        expect(secondPage.data.length).toBeLessThanOrEqual(1);
        // Cursor pagination doesn't return total
        expect(firstPage.meta.total).toBeUndefined();
      }
    });
  });

  describe("getSession", () => {
    it("should return session details for mentor (includes currentCode)", async () => {
      const session = await SessionService.getSession(
        sessionId, workspaceId, mentorMembershipId, "MENTOR"
      );

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.title).toBe("Module 1: Intro");
    });

    it("should return session details for student (excludes currentCode)", async () => {
      const session = await SessionService.getSession(
        sessionId, workspaceId, studentMembershipId, "STUDENT"
      );

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.currentCode).toBeUndefined();
    });

    it("should throw NotFoundError if session does not exist", async () => {
      await expect(
        SessionService.getSession("non-existent", workspaceId, mentorMembershipId, "MENTOR")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if session belongs to another workspace", async () => {
      const otherWs = await prisma.workspace.create({
        data: {
          name: "Other WS",
          settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
        },
      });

      await expect(
        SessionService.getSession(sessionId, otherWs.id, mentorMembershipId, "MENTOR")
      ).rejects.toThrow(ForbiddenError);

      await prisma.workspace.delete({ where: { id: otherWs.id } });
    });

    it("should throw ForbiddenError for unenrolled student", async () => {
      const otherBatch = await prisma.batch.create({
        data: {
          workspaceId,
          name: "Get Session Other Batch",
          startDate: new Date("2026-01-01"),
        },
      });

      const otherSession = await prisma.session.create({
        data: {
          batchId: otherBatch.id,
          title: "Other Batch Session",
          scheduledStart: new Date("2026-07-20T10:00:00Z"),
          scheduledEnd: new Date("2026-07-20T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.getSession(otherSession.id, workspaceId, studentMembershipId, "STUDENT")
      ).rejects.toThrow(ForbiddenError);

      await prisma.session.delete({ where: { id: otherSession.id } });
      await prisma.batch.delete({ where: { id: otherBatch.id } });
    });
  });

  describe("updateSession", () => {
    it("should update session title successfully", async () => {
      const updated = await SessionService.updateSession(sessionId, workspaceId, {
        title: "Module 1: Intro (Updated)",
      });

      expect(updated.title).toBe("Module 1: Intro (Updated)");
    });

    it("should update session times successfully", async () => {
      const updated = await SessionService.updateSession(sessionId, workspaceId, {
        scheduledStart: new Date("2026-07-14T20:30:00Z").toISOString(),
        scheduledEnd: new Date("2026-07-14T21:30:00Z").toISOString(),
      });

      expect(updated.scheduledStart).toBeDefined();
      expect(updated.scheduledEnd).toBeDefined();
    });

    it("should return existing session if no changes provided", async () => {
      const result = await SessionService.updateSession(sessionId, workspaceId, {});
      expect(result.id).toBe(sessionId);
    });

    it("should throw BadRequestError if end time is before start time", async () => {
      await expect(
        SessionService.updateSession(sessionId, workspaceId, {
          scheduledStart: new Date("2026-07-14T22:00:00Z").toISOString(),
          scheduledEnd: new Date("2026-07-14T21:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw NotFoundError for non-existent session", async () => {
      await expect(
        SessionService.updateSession("fake-id", workspaceId, { title: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw BadRequestError when updating CANCELLED session", async () => {
      const cancelledSession = await prisma.session.create({
        data: {
          batchId,
          title: "Cancelled Session",
          scheduledStart: new Date("2026-07-15T10:00:00Z"),
          scheduledEnd: new Date("2026-07-15T11:00:00Z"),
          status: "CANCELLED",
        },
      });

      await expect(
        SessionService.updateSession(cancelledSession.id, workspaceId, { title: "Hack" })
      ).rejects.toThrow(BadRequestError);

      await prisma.session.delete({ where: { id: cancelledSession.id } });
    });

    it("should throw BadRequestError when updating ENDED session", async () => {
      const endedSession = await prisma.session.create({
        data: {
          batchId,
          title: "Ended Session",
          scheduledStart: new Date("2026-07-15T10:00:00Z"),
          scheduledEnd: new Date("2026-07-15T11:00:00Z"),
          status: "ENDED",
        },
      });

      await expect(
        SessionService.updateSession(endedSession.id, workspaceId, { title: "Hack" })
      ).rejects.toThrow(BadRequestError);

      await prisma.session.delete({ where: { id: endedSession.id } });
    });

    it("should throw BadRequestError when updating times on STARTED session", async () => {
      const startedSession = await prisma.session.create({
        data: {
          batchId,
          title: "Started Session",
          scheduledStart: new Date("2026-07-15T10:00:00Z"),
          scheduledEnd: new Date("2026-07-15T11:00:00Z"),
          status: "STARTED",
        },
      });

      await expect(
        SessionService.updateSession(startedSession.id, workspaceId, {
          scheduledStart: new Date("2026-07-15T12:00:00Z").toISOString(),
        })
      ).rejects.toThrow(BadRequestError);

      await prisma.session.delete({ where: { id: startedSession.id } });
    });
  });

  describe("cancelSession", () => {
    let cancelSessionId: string;

    beforeAll(async () => {
      const s = await prisma.session.create({
        data: {
          batchId,
          title: "To Be Cancelled",
          scheduledStart: new Date("2026-08-01T10:00:00Z"),
          scheduledEnd: new Date("2026-08-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });
      cancelSessionId = s.id;
    });

    it("should cancel a scheduled session", async () => {
      const result = await SessionService.cancelSession(cancelSessionId, workspaceId);
      expect(result.status).toBe("CANCELLED");
    });

    it("should throw BadRequestError if session is already cancelled", async () => {
      await expect(
        SessionService.cancelSession(cancelSessionId, workspaceId)
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if session is ended", async () => {
      const endedSession = await prisma.session.create({
        data: {
          batchId,
          title: "Ended Session",
          scheduledStart: new Date("2026-08-01T10:00:00Z"),
          scheduledEnd: new Date("2026-08-01T11:00:00Z"),
          status: "ENDED",
        },
      });

      await expect(
        SessionService.cancelSession(endedSession.id, workspaceId)
      ).rejects.toThrow(BadRequestError);

      await prisma.session.delete({ where: { id: endedSession.id } });
    });

    it("should throw ForbiddenError if batch belongs to another workspace", async () => {
      const otherWs = await prisma.workspace.create({
        data: {
          name: "Cancel Other WS",
          settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
        },
      });

      const otherBatch = await prisma.batch.create({
        data: {
          workspaceId: otherWs.id,
          name: "Cancel Other Batch",
          startDate: new Date("2026-01-01"),
        },
      });

      const otherSession = await prisma.session.create({
        data: {
          batchId: otherBatch.id,
          title: "Other Session",
          scheduledStart: new Date("2026-08-01T10:00:00Z"),
          scheduledEnd: new Date("2026-08-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.cancelSession(otherSession.id, workspaceId)
      ).rejects.toThrow(ForbiddenError);

      await prisma.session.delete({ where: { id: otherSession.id } });
      await prisma.batch.delete({ where: { id: otherBatch.id } });
      await prisma.workspace.delete({ where: { id: otherWs.id } });
    });
  });

  describe("openAttendanceWindow", () => {
    let attendanceSessionId: string;

    beforeAll(async () => {
      const s = await prisma.session.create({
        data: {
          batchId,
          title: "Attendance Test Session",
          scheduledStart: new Date("2026-09-01T10:00:00Z"),
          scheduledEnd: new Date("2026-09-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });
      attendanceSessionId = s.id;
    });

    it("should open attendance window for mentor", async () => {
      const result = await SessionService.openAttendanceWindow(
        attendanceSessionId, workspaceId, mentorMembershipId, "MENTOR"
      );

      expect(result.status).toBe("STARTED");
      expect(result.currentCode).toBeDefined();
      expect(result.currentCode).toMatch(/^\d{6}$/);
    });

    it("should throw BadRequestError if attendance already open", async () => {
      await expect(
        SessionService.openAttendanceWindow(
          attendanceSessionId, workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw NotFoundError for non-existent session", async () => {
      await expect(
        SessionService.openAttendanceWindow(
          "fake-id", workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if batch belongs to another workspace", async () => {
      const otherWs = await prisma.workspace.create({
        data: {
          name: "Open Other WS",
          settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
        },
      });

      const otherBatch = await prisma.batch.create({
        data: {
          workspaceId: otherWs.id,
          name: "Open Other Batch",
          startDate: new Date("2026-01-01"),
        },
      });

      const otherSession = await prisma.session.create({
        data: {
          batchId: otherBatch.id,
          title: "Other Session",
          scheduledStart: new Date("2026-09-01T10:00:00Z"),
          scheduledEnd: new Date("2026-09-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.openAttendanceWindow(
          otherSession.id, workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(ForbiddenError);

      await prisma.session.delete({ where: { id: otherSession.id } });
      await prisma.batch.delete({ where: { id: otherBatch.id } });
      await prisma.workspace.delete({ where: { id: otherWs.id } });
    });
  });

  describe("closeAttendanceWindow", () => {
    let closeSessionId: string;

    beforeAll(async () => {
      const s = await prisma.session.create({
        data: {
          batchId,
          title: "Close Attendance Test",
          scheduledStart: new Date("2026-10-01T10:00:00Z"),
          scheduledEnd: new Date("2026-10-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });
      closeSessionId = s.id;

      await SessionService.openAttendanceWindow(
        closeSessionId, workspaceId, mentorMembershipId, "MENTOR"
      );
    });

    it("should close attendance window for mentor", async () => {
      const result = await SessionService.closeAttendanceWindow(
        closeSessionId, workspaceId, mentorMembershipId, "MENTOR"
      );

      expect(result.status).toBe("ENDED");
      expect(result.currentCode).toBeNull();
    });

    it("should throw BadRequestError if attendance already closed", async () => {
      await expect(
        SessionService.closeAttendanceWindow(
          closeSessionId, workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if session is not started", async () => {
      const scheduledSession = await prisma.session.create({
        data: {
          batchId,
          title: "Not Started Session",
          scheduledStart: new Date("2026-10-02T10:00:00Z"),
          scheduledEnd: new Date("2026-10-02T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.closeAttendanceWindow(
          scheduledSession.id, workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(BadRequestError);

      await prisma.session.delete({ where: { id: scheduledSession.id } });
    });

    it("should throw ForbiddenError if batch belongs to another workspace", async () => {
      const otherWs = await prisma.workspace.create({
        data: {
          name: "Close Other WS",
          settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
        },
      });

      const otherBatch = await prisma.batch.create({
        data: {
          workspaceId: otherWs.id,
          name: "Close Other Batch",
          startDate: new Date("2026-01-01"),
        },
      });

      const otherSession = await prisma.session.create({
        data: {
          batchId: otherBatch.id,
          title: "Other Session",
          scheduledStart: new Date("2026-10-01T10:00:00Z"),
          scheduledEnd: new Date("2026-10-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.closeAttendanceWindow(
          otherSession.id, workspaceId, mentorMembershipId, "MENTOR"
        )
      ).rejects.toThrow(ForbiddenError);

      await prisma.session.delete({ where: { id: otherSession.id } });
      await prisma.batch.delete({ where: { id: otherBatch.id } });
      await prisma.workspace.delete({ where: { id: otherWs.id } });
    });
  });

  describe("CR (Class Representative) permissions", () => {
    let crMembershipId: string;
    let crSessionId: string;

    beforeAll(async () => {
      const crMem = await prisma.batchMembership.update({
        where: { id: batchMembershipId },
        data: { isCR: true },
      });
      crMembershipId = crMem.membershipId;

      const s = await prisma.session.create({
        data: {
          batchId,
          title: "CR Test Session",
          scheduledStart: new Date("2026-11-01T10:00:00Z"),
          scheduledEnd: new Date("2026-11-01T11:00:00Z"),
          status: "SCHEDULED",
        },
      });
      crSessionId = s.id;
    });

    afterAll(async () => {
      await prisma.batchMembership.update({
        where: { id: batchMembershipId },
        data: { isCR: false },
      });
      await prisma.session.delete({ where: { id: crSessionId } });
    });

    it("should allow CR to open attendance window", async () => {
      const result = await SessionService.openAttendanceWindow(
        crSessionId, workspaceId, crMembershipId, "STUDENT"
      );
      expect(result.status).toBe("STARTED");
    });

    it("should allow CR to close attendance window", async () => {
      const result = await SessionService.closeAttendanceWindow(
        crSessionId, workspaceId, crMembershipId, "STUDENT"
      );
      expect(result.status).toBe("ENDED");
    });

    it("should throw ForbiddenError for non-CR student on open", async () => {
      // Remove CR flag
      await prisma.batchMembership.update({
        where: { id: batchMembershipId },
        data: { isCR: false },
      });

      const nonCrSession = await prisma.session.create({
        data: {
          batchId,
          title: "Non-CR Test",
          scheduledStart: new Date("2026-11-02T10:00:00Z"),
          scheduledEnd: new Date("2026-11-02T11:00:00Z"),
          status: "SCHEDULED",
        },
      });

      await expect(
        SessionService.openAttendanceWindow(
          nonCrSession.id, workspaceId, studentMembershipId, "STUDENT"
        )
      ).rejects.toThrow(ForbiddenError);

      await prisma.session.delete({ where: { id: nonCrSession.id } });

      // Restore CR flag for other tests
      await prisma.batchMembership.update({
        where: { id: batchMembershipId },
        data: { isCR: true },
      });
    });
  });
});
