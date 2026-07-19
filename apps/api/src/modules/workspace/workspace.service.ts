import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

import {
  IWorkspaceResult,
  IMemberResult,
  IListMembersResult,
  IInviteMemberPayload,
  IListMembersParams,
  IMyBatchResult,
} from "@studentos/shared-types";

export class WorkspaceService {
  static async getWorkspaceFromDB({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<IWorkspaceResult> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        timezone: true,
        settings: {
          select: {
            defaultAttendanceDurationMins: true,
            lateThresholdMins: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new Error("Active workspace not found");
    }

    return {
      id: workspace.id,
      name: workspace.name,
      timezone: workspace.timezone,
      settings: workspace.settings ?? {
        defaultAttendanceDurationMins: 15,
        lateThresholdMins: 10,
      },
    };
  }

  static async updateWorkspaceSettingsIntoDB(
    workspaceId: string,
    timezone?: string,
    defaultAttendanceDurationMins?: number,
    lateThresholdMins?: number,
  ): Promise<IWorkspaceResult> {
    const data: import("@prisma/client").Prisma.WorkspaceUpdateInput = {};
    const settingsData: import("@prisma/client").Prisma.WorkspaceSettingsUpdateInput = {};

    if (timezone !== undefined) {
      data.timezone = timezone;
    }

    if (defaultAttendanceDurationMins !== undefined) {
      settingsData.defaultAttendanceDurationMins =
        defaultAttendanceDurationMins;
    }

    if (lateThresholdMins !== undefined) {
      settingsData.lateThresholdMins = lateThresholdMins;
    }

    const result = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(timezone !== undefined ? { timezone } : {}),
        settings: {
          upsert: {
            create: {
              defaultAttendanceDurationMins: defaultAttendanceDurationMins ?? 15,
              lateThresholdMins: lateThresholdMins ?? 10,
            },
            update: {
              ...(defaultAttendanceDurationMins !== undefined ? { defaultAttendanceDurationMins } : {}),
              ...(lateThresholdMins !== undefined ? { lateThresholdMins } : {}),
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        settings: {
          select: {
            defaultAttendanceDurationMins: true,
            lateThresholdMins: true,
          },
        },
      },
    });

    if (!result) {
      throw new Error("Active workspace not found");
    }

    return {
      id: result.id,
      name: result.name,
      timezone: result.timezone,
      settings: {
        defaultAttendanceDurationMins:
          result.settings!.defaultAttendanceDurationMins,
        lateThresholdMins: result.settings!.lateThresholdMins,
      },
    };
  }

  static async inviteMemberIntoDB(
    workspaceId: string,
    payload: IInviteMemberPayload,
  ): Promise<IMemberResult> {
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name },
      create: { email: payload.email, name: payload.name },
    });

    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        workspaceId,
        role: payload.role,
      },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (existingMembership) {
      return existingMembership;
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        workspaceId: workspaceId,
        role: payload.role,
        status: MembershipStatus.ACTIVE,
      },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return membership;
  }

  static async getListMembersFromDB(
    params: IListMembersParams,
  ): Promise<IListMembersResult> {
    const skip = (params.page - 1) * params.limit;

    const [total, memberships] = await Promise.all([
      prisma.membership.count({
        where: {
          workspaceId: params.workspaceId,
          status: MembershipStatus.ACTIVE,
        },
      }),
      prisma.membership.findMany({
        where: {
          workspaceId: params.workspaceId,
          status: MembershipStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
        select: {
          id: true,
          userId: true,
          workspaceId: true,
          role: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return { total, memberships };
  }

  static async getMyBatchesFromDB(membershipId: string): Promise<IMyBatchResult[]> {
    const enrollments = await prisma.batchMembership.findMany({
      where: {
        membershipId,
        revokedAt: null,
      },
      select: {
        id: true,
        isCR: true,
        batch: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isArchived: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    return enrollments.map((enrollment) => ({
      batchMembershipId: enrollment.id,
      batchId: enrollment.batch.id,
      batchName: enrollment.batch.name,
      isCR: enrollment.isCR,
      startDate: enrollment.batch.startDate,
      endDate: enrollment.batch.endDate,
      isArchived: enrollment.batch.isArchived,
    }));
  }

  static async deactivateMemberIntoDB(membershipId: string): Promise<IMemberResult> {
    const membership = await prisma.membership.update({
      where: {
        id: membershipId,
      },
      data: {
        status: MembershipStatus.INACTIVE,
      },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return membership;
  }
}
