import { randomInt } from "crypto";
import { prisma } from "../../lib/prisma";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../../common/errors";

export class SessionService {
  // Route 1: Create Session
  static async createSession(
    batchId: string,
    workspaceId: string,
    data: {
      title: string;
      scheduledStart: string;
      scheduledEnd: string;
      meetLink?: string;
      description?: string;
      type?: "REGULAR" | "MAKEUP" | "EXAM";
    }
  ): Promise<any> {
    // 1. Validate batch exists and belongs to workspace
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        workspaceId: true,
        isArchived: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!batch) {
      throw new NotFoundError("Batch not found.", "BATCH_NOT_FOUND");
    }

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This batch does not belong to your workspace.");
    }

    // 2. Check batch is not archived
    if (batch.isArchived) {
      throw new BadRequestError(
        "Cannot create session in archived batch.",
        "BATCH_ARCHIVED"
      );
    }

    // 3. Validate scheduledEnd is after scheduledStart
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);

    if (end <= start) {
      throw new BadRequestError(
        "Scheduled end time must be after start time.",
        "VALIDATION_FAILED"
      );
    }

    // 4. Validate session times are within batch date range
    if (start < batch.startDate) {
      throw new BadRequestError(
        "Session cannot start before batch start date.",
        "VALIDATION_FAILED"
      );
    }

    if (batch.endDate && end > batch.endDate) {
      throw new BadRequestError(
        "Session cannot end after batch end date.",
        "VALIDATION_FAILED"
      );
    }

    // 5. Create session record
    return prisma.session.create({
      data: {
        batchId,
        title: data.title,
        scheduledStart: start,
        scheduledEnd: end,
        meetLink: data.meetLink ?? null,
        description: data.description ?? null,
        type: data.type ?? "REGULAR",
        status: "SCHEDULED",
      },
      select: {
        id: true,
        batchId: true,
        title: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    });
  }

  // Route 2: List Sessions (with pagination)
  static async listSessions(
    batchId: string,
    workspaceId: string,
    userId: string,
    role: "MENTOR" | "STUDENT",
    page: number = 1,
    limit: number = 20,
    status?: "SCHEDULED" | "STARTED" | "ENDED" | "CANCELLED"
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    // 1. Validate batch exists and belongs to workspace
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!batch) {
      throw new NotFoundError("Batch not found.", "BATCH_NOT_FOUND");
    }

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This batch does not belong to your workspace.");
    }

    // 2. For students, verify enrollment
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId,
          membership: { userId },
          revokedAt: null,
        },
      });

      if (!batchMembership) {
        throw new ForbiddenError("You are not enrolled in this batch.");
      }
    }

    // 3. Build where clause
    const whereClause: any = { batchId };
    if (status) {
      whereClause.status = status;
    }

    // 4. Get total count and paginated results
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: whereClause,
        select: {
          id: true,
          batchId: true,
          title: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
        },
        orderBy: { scheduledStart: "desc" },
        skip,
        take: limit,
      }),
      prisma.session.count({ where: whereClause }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Route 3: Get Session Details
  static async getSession(
    sessionId: string,
    workspaceId: string,
    userId: string,
    role: "MENTOR" | "STUDENT"
  ): Promise<any> {
    // 1. Find session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        title: true,
        description: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        meetLink: true,
        type: true,
        attendanceOpenedAt: true,
        attendanceClosedAt: true,
        currentCode: true,
        batch: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    // 2. Validate batch belongs to workspace
    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 3. For students, verify enrollment
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membership: { userId },
          revokedAt: null,
        },
      });

      if (!batchMembership) {
        throw new ForbiddenError("You are not enrolled in this batch.");
      }
    }

    // 4. Return session details (exclude currentCode for students)
    const result: any = {
      id: session.id,
      batchId: session.batchId,
      title: session.title,
      description: session.description,
      status: session.status,
      scheduledStart: session.scheduledStart,
      scheduledEnd: session.scheduledEnd,
      meetLink: session.meetLink,
      type: session.type,
      attendanceOpenedAt: session.attendanceOpenedAt,
      attendanceClosedAt: session.attendanceClosedAt,
    };

    // Only include currentCode for MENTOR
    if (role === "MENTOR") {
      result.currentCode = session.currentCode;
    }

    return result;
  }

  // Route 4: Update Session
  static async updateSession(
    sessionId: string,
    workspaceId: string,
    data: {
      title?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
      meetLink?: string | null;
      description?: string | null;
      type?: "REGULAR" | "MAKEUP" | "EXAM";
    }
  ): Promise<any> {
    // 1. Find session with batch info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        title: true,
        description: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        meetLink: true,
        type: true,
        batch: {
          select: {
            workspaceId: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    // 2. Validate batch belongs to workspace
    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 3. Cannot update CANCELLED or ENDED sessions
    if (session.status === "CANCELLED") {
      throw new BadRequestError(
        "Cannot update a cancelled session.",
        "SESSION_NOT_CANCELLABLE"
      );
    }

    if (session.status === "ENDED") {
      throw new BadRequestError(
        "Cannot update an ended session.",
        "SESSION_ENDED"
      );
    }

    // 4. Cannot update time fields after attendance has been opened
    if (session.status === "STARTED") {
      if (data.scheduledStart !== undefined || data.scheduledEnd !== undefined) {
        throw new BadRequestError(
          "Cannot change session times after attendance has been opened.",
          "SESSION_IN_PROGRESS"
        );
      }
    }

    // 5. Build update data
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.meetLink !== undefined) updateData.meetLink = data.meetLink;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;

    if (data.scheduledStart !== undefined) {
      updateData.scheduledStart = new Date(data.scheduledStart);
    }

    if (data.scheduledEnd !== undefined) {
      updateData.scheduledEnd = new Date(data.scheduledEnd);
    }

    // 6. Validate times if both provided
    if (data.scheduledStart && data.scheduledEnd) {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);

      if (end <= start) {
        throw new BadRequestError(
          "Scheduled end time must be after start time.",
          "VALIDATION_FAILED"
        );
      }
    } else if (data.scheduledStart || data.scheduledEnd) {
      // Only one time provided, validate against existing
      const start = data.scheduledStart
        ? new Date(data.scheduledStart)
        : session.scheduledStart;
      const end = data.scheduledEnd
        ? new Date(data.scheduledEnd)
        : session.scheduledEnd;

      if (end <= start) {
        throw new BadRequestError(
          "Scheduled end time must be after start time.",
          "VALIDATION_FAILED"
        );
      }
    }

    // 7. Validate session times are within batch date range
    const finalStart = updateData.scheduledStart || session.scheduledStart;
    const finalEnd = updateData.scheduledEnd || session.scheduledEnd;

    if (finalStart < session.batch.startDate) {
      throw new BadRequestError(
        "Session cannot start before batch start date.",
        "VALIDATION_FAILED"
      );
    }

    if (session.batch.endDate && finalEnd > session.batch.endDate) {
      throw new BadRequestError(
        "Session cannot end after batch end date.",
        "VALIDATION_FAILED"
      );
    }

    // 8. Update session (only if there are changes)
    if (Object.keys(updateData).length === 0) {
      return {
        id: session.id,
        title: session.title,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        meetLink: session.meetLink,
        description: session.description,
        type: session.type,
      };
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        scheduledEnd: true,
        meetLink: true,
        description: true,
        type: true,
      },
    });
  }

  // Route 5: Cancel Session
  static async cancelSession(
    sessionId: string,
    workspaceId: string
  ): Promise<any> {
    // 1. Find session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        batch: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    // 2. Validate batch belongs to workspace
    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 3. Cannot cancel ENDED or CANCELLED sessions
    if (session.status === "ENDED") {
      throw new BadRequestError(
        "Cannot cancel an ended session.",
        "SESSION_NOT_CANCELLABLE"
      );
    }

    if (session.status === "CANCELLED") {
      throw new BadRequestError(
        "Session is already cancelled.",
        "SESSION_NOT_CANCELLABLE"
      );
    }

    // 4. Cancel session AND clear currentCode
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "CANCELLED",
        currentCode: null, // Clear code to prevent submission after cancel
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  // Route 6: Open Attendance Window (with atomic update and rate limiting)
  static async openAttendanceWindow(
    sessionId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT",
    userId: string
  ): Promise<any> {
    // 1. Find session with batch info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        status: true,
        attendanceOpenedAt: true,
        createdAt: true,
        batch: {
          select: {
            workspaceId: true,
            isArchived: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    // 2. Validate batch belongs to workspace
    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 3. Check batch is not archived
    if (session.batch.isArchived) {
      throw new BadRequestError(
        "Cannot open attendance for a session in an archived batch.",
        "BATCH_ARCHIVED"
      );
    }

    // 4. Verify user is MENTOR or CR
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membershipId,
          isCR: true,
          revokedAt: null,
        },
      });

      if (!batchMembership) {
        throw new ForbiddenError(
          "Only MENTOR or CR can open attendance window."
        );
      }
    }

    // 5. Generate cryptographically secure 6-digit code
    const code = randomInt(100000, 999999).toString();

    // 6. Atomic conditional update (prevents race condition)
    const updateResult = await prisma.session.updateMany({
      where: {
        id: sessionId,
        status: "SCHEDULED", // Only update if still SCHEDULED
      },
      data: {
        status: "STARTED",
        attendanceOpenedAt: new Date(),
        attendanceOpenedById: membershipId,
        currentCode: code,
        codeRotatedAt: new Date(),
      },
    });

    // 7. If update failed, someone else already opened it
    if (updateResult.count === 0) {
      throw new BadRequestError(
        "Attendance window is already open or session status has changed.",
        "ATTENDANCE_WINDOW_ALREADY_OPEN"
      );
    }

    // 8. Return the session with the code
    return {
      sessionId,
      status: "STARTED",
      attendanceOpenedAt: new Date(),
      currentCode: code,
    };
  }

  // Route 7: Close Attendance Window (with atomic update and rate limiting)
  static async closeAttendanceWindow(
    sessionId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT",
    userId: string
  ): Promise<any> {
    // 1. Find session with batch info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        status: true,
        batch: {
          select: {
            workspaceId: true,
            isArchived: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    // 2. Validate batch belongs to workspace
    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 3. Check batch is not archived
    if (session.batch.isArchived) {
      throw new BadRequestError(
        "Cannot close attendance for a session in an archived batch.",
        "BATCH_ARCHIVED"
      );
    }

    // 4. Verify user is MENTOR or CR
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membershipId,
          isCR: true,
          revokedAt: null,
        },
      });

      if (!batchMembership) {
        throw new ForbiddenError(
          "Only MENTOR or CR can close attendance window."
        );
      }
    }

    // 5. Atomic conditional update (prevents race condition)
    const updateResult = await prisma.session.updateMany({
      where: {
        id: sessionId,
        status: "STARTED", // Only update if still STARTED
      },
      data: {
        status: "ENDED",
        attendanceClosedAt: new Date(),
        attendanceClosedById: membershipId,
        currentCode: null, // Clear code
      },
    });

    // 6. If update failed, someone else already closed it
    if (updateResult.count === 0) {
      throw new BadRequestError(
        "Attendance window is already closed or session status has changed.",
        "ATTENDANCE_WINDOW_CLOSED"
      );
    }

    // 7. Return the updated session
    return {
      sessionId,
      status: "ENDED",
      attendanceClosedAt: new Date(),
      currentCode: null,
    };
  }
}
