import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../common/errors";

export interface BatchMetrics {
  totalStudents: number;
  totalCRs: number;
  totalSessions: number;
}

export interface BatchDetails {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  isArchived: boolean;
  lateThresholdMinsOverride: number | null;
  attendanceDurationMinsOverride: number | null;
  metrics: BatchMetrics;
}

export class BatchService {
  static async createBatch(
    workspaceId: string,
    data: {
      name: string;
      startDate: string;
      endDate?: string | null;
      lateThresholdMinsOverride?: number | null;
      attendanceDurationMinsOverride?: number | null;
    }
  ): Promise<any> {
    return prisma.batch.create({
      data: {
        workspaceId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        lateThresholdMinsOverride: data.lateThresholdMinsOverride ?? null,
        attendanceDurationMinsOverride: data.attendanceDurationMinsOverride ?? null,
      },
    });
  }

  static async listBatches(workspaceId: string): Promise<any[]> {
    return prisma.batch.findMany({
      where: {
        workspaceId,
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async getBatch(workspaceId: string, batchId: string): Promise<BatchDetails> {
    const [batch, totalStudents, totalCRs, totalSessions] = await Promise.all([
      prisma.batch.findFirst({
        where: { id: batchId, workspaceId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isArchived: true,
          lateThresholdMinsOverride: true,
          attendanceDurationMinsOverride: true,
        },
      }),
      prisma.batchMembership.count({
        where: {
          batchId,
          revokedAt: null,
          membership: {
            role: "STUDENT",
          },
        },
      }),
      prisma.batchMembership.count({
        where: {
          batchId,
          revokedAt: null,
          isCR: true,
        },
      }),
      prisma.session.count({
        where: {
          batchId,
        },
      }),
    ]);

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    return {
      id: batch.id,
      name: batch.name,
      startDate: batch.startDate,
      endDate: batch.endDate,
      isArchived: batch.isArchived,
      lateThresholdMinsOverride: batch.lateThresholdMinsOverride,
      attendanceDurationMinsOverride: batch.attendanceDurationMinsOverride,
      metrics: {
        totalStudents,
        totalCRs,
        totalSessions,
      },
    };
  }

  static async updateBatch(
    workspaceId: string,
    batchId: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string | null;
      lateThresholdMinsOverride?: number | null;
      attendanceDurationMinsOverride?: number | null;
    }
  ): Promise<any> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, workspaceId },
      select: { id: true },
    });

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined)
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.lateThresholdMinsOverride !== undefined)
      updateData.lateThresholdMinsOverride = data.lateThresholdMinsOverride;
    if (data.attendanceDurationMinsOverride !== undefined)
      updateData.attendanceDurationMinsOverride = data.attendanceDurationMinsOverride;

    return prisma.batch.update({
      where: { id: batchId },
      data: updateData,
    });
  }

  static async archiveBatch(workspaceId: string, batchId: string): Promise<any> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, workspaceId },
      select: { id: true, isArchived: true },
    });

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    return prisma.batch.update({
      where: { id: batchId },
      data: {
        isArchived: !batch.isArchived,
      },
    });
  }

  static async allocateMember(
    workspaceId: string,
    batchId: string,
    data: {
      membershipId: string;
      isCR?: boolean;
    }
  ): Promise<any> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, workspaceId },
      select: { id: true },
    });

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    const membership = await prisma.membership.findFirst({
      where: { id: data.membershipId, workspaceId, status: "ACTIVE" },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundError(
        "The specified active workspace member was not found.",
        "MEMBER_NOT_FOUND"
      );
    }

    try {
      return await prisma.batchMembership.create({
        data: {
          batchId,
          membershipId: data.membershipId,
          isCR: data.isCR ?? false,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.batchMembership.findUnique({
          where: {
            membershipId_batchId: {
              membershipId: data.membershipId,
              batchId,
            },
          },
          select: { id: true, revokedAt: true },
        });

        if (existing) {
          if (existing.revokedAt === null) {
            throw new BadRequestError(
              "Member is already active in this batch.",
              "DUPLICATE_ALLOCATION"
            );
          }

          return prisma.batchMembership.update({
            where: { id: existing.id },
            data: {
              revokedAt: null,
              isCR: data.isCR ?? false,
              assignedAt: new Date(),
            },
          });
        }
      }
      throw error;
    }
  }

  static async listBatchMembers(
    workspaceId: string,
    batchId: string,
    roleFilter?: "MENTOR" | "STUDENT"
  ): Promise<any[]> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, workspaceId },
    });

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    const whereClause: any = {
      batchId,
      revokedAt: null,
    };

    if (roleFilter) {
      whereClause.membership = {
        role: roleFilter,
      };
    }

    const members = await prisma.batchMembership.findMany({
      where: whereClause,
      include: {
        membership: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    return members.map((m) => ({
      batchMembershipId: m.id,
      membershipId: m.membershipId,
      userId: m.membership.user.id,
      name: m.membership.user.name,
      email: m.membership.user.email,
      role: m.membership.role,
      isCR: m.isCR,
      assignedAt: m.assignedAt,
    }));
  }

  static async updateBatchMembership(
    workspaceId: string,
    batchId: string,
    batchMembershipId: string,
    data: {
      isCR?: boolean;
      revokedAt?: string | null;
    }
  ): Promise<any> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, workspaceId },
    });

    if (!batch) {
      throw new NotFoundError("The specified batch was not found.", "BATCH_NOT_FOUND");
    }

    const batchMembership = await prisma.batchMembership.findUnique({
      where: { id: batchMembershipId },
    });

    if (!batchMembership || batchMembership.batchId !== batchId) {
      throw new NotFoundError("The batch membership record was not found.", "MEMBERSHIP_NOT_FOUND");
    }

    const updateData: any = {};
    if (data.isCR !== undefined) updateData.isCR = data.isCR;
    if (data.revokedAt !== undefined) {
      updateData.revokedAt = data.revokedAt ? new Date(data.revokedAt) : null;
    }

    return prisma.batchMembership.update({
      where: { id: batchMembershipId },
      data: updateData,
    });
  }
}
