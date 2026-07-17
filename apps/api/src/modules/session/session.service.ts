import { randomInt } from "crypto";
import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../common/errors";
import { buildPaginationMeta } from "../../utils/pagination";

// Shared select fragment — avoids duplication, keeps queries consistent
const SESSION_SELECT = {
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
} as const;

const BATCH_SELECT = {
  workspaceId: true,
  isArchived: true,
  startDate: true,
  endDate: true,
} as const;

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
    // 1. Validate batch exists and belongs to workspace (select only needed fields)
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: BATCH_SELECT,
    });

    if (!batch) {
      throw new NotFoundError("Batch not found.", "BATCH_NOT_FOUND");
    }

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This batch does not belong to your workspace.");
    }

    if (batch.isArchived) {
      throw new BadRequestError("Cannot create session in archived batch.", "BATCH_ARCHIVED");
    }

    // 2. Validate times
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);

    if (end <= start) {
      throw new BadRequestError(
        "Scheduled end time must be after start time.",
        "VALIDATION_FAILED"
      );
    }

    if (start < batch.startDate) {
      throw new BadRequestError(
        "Session cannot start before batch start date.",
        "VALIDATION_FAILED"
      );
    }

    if (batch.endDate && end > batch.endDate) {
      throw new BadRequestError("Session cannot end after batch end date.", "VALIDATION_FAILED");
    }

    // 3. Create session
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

  // Route 2: List Sessions (cursor-based pagination for scale)
  static async listSessions(
    batchId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT",
    page: number = 1,
    limit: number = 20,
    status?: "SCHEDULED" | "STARTED" | "ENDED" | "CANCELLED",
    cursor?: string
  ): Promise<{
    data: any[];
    meta: {
      total?: number;
      page: number;
      limit: number;
      totalPages?: number;
      nextCursor: string | null;
    };
  }> {
    // 1. Validate batch exists and belongs to workspace
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { workspaceId: true },
    });

    if (!batch) {
      throw new NotFoundError("Batch not found.", "BATCH_NOT_FOUND");
    }

    if (batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This batch does not belong to your workspace.");
    }

    // 2. For students, verify enrollment (direct lookup — no JOIN through Membership)
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId,
          membershipId,
          revokedAt: null,
        },
        select: { id: true },
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

    // 4. Cursor-based pagination (constant time regardless of depth)
    if (cursor) {
      whereClause.scheduledStart = { lt: new Date(cursor) };
    }

    const sessions = await prisma.session.findMany({
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
      take: limit + 1, // +1 to detect hasMore
    });

    const hasMore = sessions.length > limit;
    const data = hasMore ? sessions.slice(0, limit) : sessions;
    const nextCursor = hasMore ? data[data.length - 1].scheduledStart.toISOString() : null;

    // Only run count for offset pagination (cursor pagination doesn't need it)
    if (!cursor) {
      const total = await prisma.session.count({ where: whereClause });
      return {
        data,
        meta: {
          ...buildPaginationMeta(page, limit, total),
          nextCursor,
        },
      };
    }

    return {
      data,
      meta: {
        page,
        limit,
        nextCursor,
      },
    };
  }

  // Route 3: Get Session Details (single query with select, no full batch fetch)
  static async getSession(
    sessionId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT"
  ): Promise<any> {
    // 1. Find session with batch workspace check (1 query for both)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        ...SESSION_SELECT,
        batch: { select: { workspaceId: true } },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 2. For students, verify enrollment (1 indexed query)
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membershipId,
          revokedAt: null,
        },
        select: { id: true },
      });

      if (!batchMembership) {
        throw new ForbiddenError("You are not enrolled in this batch.");
      }
    }

    // 3. Return (exclude currentCode for students)
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

    if (role === "MENTOR") {
      result.currentCode = session.currentCode;
    }

    return result;
  }

  // Route 4: Update Session (select only needed batch fields)
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
    // 1. Find session with only needed batch fields
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        title: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        meetLink: true,
        description: true,
        type: true,
        batch: { select: BATCH_SELECT },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 2. Status checks
    if (session.status === "CANCELLED") {
      throw new BadRequestError("Cannot update a cancelled session.", "SESSION_NOT_CANCELLABLE");
    }

    if (session.status === "ENDED") {
      throw new BadRequestError("Cannot update an ended session.", "SESSION_ENDED");
    }

    if (session.status === "STARTED") {
      if (data.scheduledStart !== undefined || data.scheduledEnd !== undefined) {
        throw new BadRequestError(
          "Cannot change session times after attendance has been opened.",
          "SESSION_IN_PROGRESS"
        );
      }
    }

    // 3. Build update data
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

    // 4. Validate times
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
      const start = data.scheduledStart ? new Date(data.scheduledStart) : session.scheduledStart;
      const end = data.scheduledEnd ? new Date(data.scheduledEnd) : session.scheduledEnd;

      if (end <= start) {
        throw new BadRequestError(
          "Scheduled end time must be after start time.",
          "VALIDATION_FAILED"
        );
      }
    }

    // 5. Validate against batch date range
    const finalStart = updateData.scheduledStart || session.scheduledStart;
    const finalEnd = updateData.scheduledEnd || session.scheduledEnd;

    if (finalStart < session.batch.startDate) {
      throw new BadRequestError(
        "Session cannot start before batch start date.",
        "VALIDATION_FAILED"
      );
    }

    if (session.batch.endDate && finalEnd > session.batch.endDate) {
      throw new BadRequestError("Session cannot end after batch end date.", "VALIDATION_FAILED");
    }

    // 6. No changes — return existing
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

  // Route 5: Cancel Session (select only needed batch fields)
  static async cancelSession(sessionId: string, workspaceId: string): Promise<any> {
    // 1. Find session with only workspaceId check
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        batch: { select: { workspaceId: true } },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    // 2. Status checks
    if (session.status === "ENDED") {
      throw new BadRequestError("Cannot cancel an ended session.", "SESSION_NOT_CANCELLABLE");
    }

    if (session.status === "CANCELLED") {
      throw new BadRequestError("Session is already cancelled.", "SESSION_NOT_CANCELLABLE");
    }

    // 3. Cancel and clear code
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "CANCELLED",
        currentCode: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  // Route 6: Open Attendance Window (select only needed batch fields)
  static async openAttendanceWindow(
    sessionId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT"
  ): Promise<any> {
    // 1. Find session with only needed fields
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        status: true,
        batch: { select: { workspaceId: true, isArchived: true } },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    if (session.batch.isArchived) {
      throw new BadRequestError(
        "Cannot open attendance for a session in an archived batch.",
        "BATCH_ARCHIVED"
      );
    }

    // 2. Verify MENTOR or CR (direct lookup — no JOIN)
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membershipId,
          isCR: true,
          revokedAt: null,
        },
        select: { id: true },
      });

      if (!batchMembership) {
        throw new ForbiddenError("Only MENTOR or CR can open attendance window.");
      }
    }

    // 3. Generate code and atomic update
    const code = randomInt(100000, 999999).toString();

    const updateResult = await prisma.session.updateMany({
      where: {
        id: sessionId,
        status: "SCHEDULED",
      },
      data: {
        status: "STARTED",
        attendanceOpenedAt: new Date(),
        attendanceOpenedById: membershipId,
        currentCode: code,
        codeRotatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestError(
        "Attendance window is already open or session status has changed.",
        "ATTENDANCE_WINDOW_ALREADY_OPEN"
      );
    }

    return {
      sessionId,
      status: "STARTED",
      attendanceOpenedAt: new Date(),
      currentCode: code,
    };
  }

  // Route 7: Close Attendance Window (select only needed batch fields)
  static async closeAttendanceWindow(
    sessionId: string,
    workspaceId: string,
    membershipId: string,
    role: "MENTOR" | "STUDENT"
  ): Promise<any> {
    // 1. Find session with only needed fields
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        batchId: true,
        status: true,
        batch: { select: { workspaceId: true, isArchived: true } },
      },
    });

    if (!session) {
      throw new NotFoundError("Session not found.", "SESSION_NOT_FOUND");
    }

    if (session.batch.workspaceId !== workspaceId) {
      throw new ForbiddenError("This session does not belong to your workspace.");
    }

    if (session.batch.isArchived) {
      throw new BadRequestError(
        "Cannot close attendance for a session in an archived batch.",
        "BATCH_ARCHIVED"
      );
    }

    // 2. Verify MENTOR or CR (direct lookup — no JOIN)
    if (role === "STUDENT") {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: {
          batchId: session.batchId,
          membershipId,
          isCR: true,
          revokedAt: null,
        },
        select: { id: true },
      });

      if (!batchMembership) {
        throw new ForbiddenError("Only MENTOR or CR can close attendance window.");
      }
    }

    // 3. Atomic update
    const updateResult = await prisma.session.updateMany({
      where: {
        id: sessionId,
        status: "STARTED",
      },
      data: {
        status: "ENDED",
        attendanceClosedAt: new Date(),
        attendanceClosedById: membershipId,
        currentCode: null,
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestError(
        "Attendance window is already closed or session status has changed.",
        "ATTENDANCE_WINDOW_CLOSED"
      );
    }

    return {
      sessionId,
      status: "ENDED",
      attendanceClosedAt: new Date(),
      currentCode: null,
    };
  }
}
