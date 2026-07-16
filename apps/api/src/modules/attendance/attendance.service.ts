import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../../common/errors";

export interface SubmitAttendanceResult {
  id: string;
  sessionId: string;
  studentBatchMembershipId: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  method: "SELF_SUBMITTED" | "MANUAL";
  submittedAt: Date;
}

export interface AttendanceRosterItem {
  studentBatchMembershipId: string;
  userId: string;
  name: string;
  email: string;
  isCR: boolean;
  attendance: {
    id: string;
    status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
    method: "SELF_SUBMITTED" | "MANUAL";
    submittedAt: Date | null;
    manualReason: string | null;
    markedBy: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface AttendanceHistoryItem {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionDate: Date;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  method: "SELF_SUBMITTED" | "MANUAL";
  submittedAt: Date | null;
  manualReason: string | null;
}

export class AttendanceService {
  static async submitAttendance(
    sessionId: string,
    studentMembershipId: string,
    code: string,
  ): Promise<SubmitAttendanceResult> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        currentCode: true,
        attendanceOpenedAt: true,
        createdAt: true,
        batchId: true,
        batch: {
          select: {
            workspaceId: true,
            lateThresholdMinsOverride: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError(
        "The specified session does not exist.",
        "SESSION_NOT_FOUND",
      );
    }

    if (session.status !== "STARTED") {
      throw new BadRequestError(
        "Attendance submission is not open for this session.",
        "SESSION_NOT_STARTED",
      );
    }

    if (!session.currentCode || session.currentCode !== code) {
      throw new BadRequestError("Invalid check-in code.", "INVALID_CODE");
    }

    const studentBatchMembership = await prisma.batchMembership.findFirst({
      where: {
        membershipId: studentMembershipId,
        batchId: session.batchId,
        revokedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!studentBatchMembership) {
      throw new ForbiddenError(
        "You are not enrolled in the batch for this session.",
        "NOT_ENROLLED",
      );
    }

    let lateThresholdMins = 10;
    if (
      session.batch.lateThresholdMinsOverride !== null &&
      session.batch.lateThresholdMinsOverride !== undefined
    ) {
      lateThresholdMins = session.batch.lateThresholdMinsOverride;
    } else {
      const settings = await prisma.workspaceSettings.findUnique({
        where: { workspaceId: session.batch.workspaceId },
        select: { lateThresholdMins: true },
      });
      if (
        settings?.lateThresholdMins !== null &&
        settings?.lateThresholdMins !== undefined
      ) {
        lateThresholdMins = settings.lateThresholdMins;
      }
    }

    const now = new Date();
    const openedAt = session.attendanceOpenedAt || session.createdAt;
    const diffMs = now.getTime() - openedAt.getTime();
    const diffMins = diffMs / (1000 * 60);

    const status = diffMins <= lateThresholdMins ? "PRESENT" : "LATE";

    try {
      const record = await prisma.attendance.create({
        data: {
          sessionId,
          studentBatchMembershipId: studentBatchMembership.id,
          status,
          method: "SELF_SUBMITTED",
          submittedAt: now,
        },
      });

      return {
        id: record.id,
        sessionId: record.sessionId,
        studentBatchMembershipId: record.studentBatchMembershipId,
        status: record.status as any,
        method: record.method as any,
        submittedAt: record.submittedAt!,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestError(
          "Attendance has already been submitted for this session.",
          "ALREADY_SUBMITTED",
        );
      }
      throw error;
    }
  }

  static async manualMarkAttendance(
    sessionId: string,
    actorMembershipId: string,
    actorRole: string,
    data: {
      studentBatchMembershipId: string;
      status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
      manualReason: string;
    },
  ): Promise<any> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError(
        "The specified session does not exist.",
        "SESSION_NOT_FOUND",
      );
    }

    if (actorRole === "STUDENT") {
      const crMembership = await prisma.batchMembership.findFirst({
        where: {
          membershipId: actorMembershipId,
          batchId: session.batchId,
          isCR: true,
          revokedAt: null,
        },
      });

      if (!crMembership) {
        throw new ForbiddenError(
          "Only Mentors or Class Representatives can manually mark attendance.",
          "UNAUTHORIZED",
        );
      }
    }

    const targetStudent = await prisma.batchMembership.findFirst({
      where: {
        id: data.studentBatchMembershipId,
        batchId: session.batchId,
        revokedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!targetStudent) {
      throw new BadRequestError(
        "The target student is not enrolled in this batch.",
        "STUDENT_NOT_ENROLLED",
      );
    }

    const record = await prisma.attendance.upsert({
      where: {
        sessionId_studentBatchMembershipId: {
          sessionId,
          studentBatchMembershipId: data.studentBatchMembershipId,
        },
      },
      update: {
        status: data.status,
        method: "MANUAL",
        markedById: actorMembershipId,
        manualReason: data.manualReason,
        submittedAt: new Date(),
      },
      create: {
        sessionId,
        studentBatchMembershipId: data.studentBatchMembershipId,
        status: data.status,
        method: "MANUAL",
        markedById: actorMembershipId,
        manualReason: data.manualReason,
        submittedAt: new Date(),
      },
    });

    return record;
  }

  static async getSessionAttendanceRoster(
    sessionId: string,
  ): Promise<AttendanceRosterItem[]> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { batchId: true },
    });

    if (!session) {
      throw new NotFoundError(
        "The specified session does not exist.",
        "SESSION_NOT_FOUND",
      );
    }

    const enrollments = await prisma.batchMembership.findMany({
      where: {
        batchId: session.batchId,
        revokedAt: null,
      },
      select: {
        id: true,
        isCR: true,
        membership: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        attendances: {
          where: { sessionId },
          select: {
            id: true,
            status: true,
            method: true,
            submittedAt: true,
            manualReason: true,
            markedBy: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        membership: {
          user: {
            name: "asc",
          },
        },
      },
    });

    return enrollments.map((enroll: any) => {
      const att = enroll.attendances?.[0] || null;

      return {
        studentBatchMembershipId: enroll.id,
        userId: enroll.membership.user.id,
        name: enroll.membership.user.name,
        email: enroll.membership.user.email,
        isCR: enroll.isCR,
        attendance: att
          ? {
              id: att.id,
              status: att.status as any,
              method: att.method as any,
              submittedAt: att.submittedAt,
              manualReason: att.manualReason,
              markedBy: att.markedBy
                ? {
                    id: att.markedBy.id,
                    name: att.markedBy.user.name,
                  }
                : null,
            }
          : null,
      };
    });
  }

  static async getStudentAttendanceHistory(
    batchMembershipId: string,
    actorMembershipId: string,
    actorRole: string,
  ): Promise<AttendanceHistoryItem[]> {
    const targetStudent = await prisma.batchMembership.findUnique({
      where: { id: batchMembershipId },
      select: { membershipId: true },
    });

    if (!targetStudent) {
      throw new NotFoundError(
        "The specified student batch enrollment was not found.",
        "ENROLLMENT_NOT_FOUND",
      );
    }

    if (
      actorRole === "STUDENT" &&
      targetStudent.membershipId !== actorMembershipId
    ) {
      throw new ForbiddenError(
        "You do not have permission to view this student's history.",
        "UNAUTHORIZED",
      );
    }

    const attendances = await prisma.attendance.findMany({
      where: { studentBatchMembershipId: batchMembershipId },
      select: {
        id: true,
        sessionId: true,
        status: true,
        method: true,
        submittedAt: true,
        manualReason: true,
        session: {
          select: {
            title: true,
            scheduledStart: true,
          },
        },
      },
      orderBy: {
        session: {
          scheduledStart: "desc",
        },
      },
    });

    return attendances.map((a: any) => ({
      id: a.id,
      sessionId: a.sessionId,
      sessionTitle: a.session.title,
      sessionDate: a.session.scheduledStart,
      status: a.status as any,
      method: a.method as any,
      submittedAt: a.submittedAt,
      manualReason: a.manualReason,
    }));
  }
}
