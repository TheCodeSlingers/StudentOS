import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export interface WorkspaceResult {
  id: string;
  name: string;
  timezone: string;
  settings: {
    defaultAttendanceDurationMins: number;
    lateThresholdMins: number;
  };
}

export interface MemberResult {
  id: string;
  userId: string;
  workspaceId: string;
  role: MembershipRole;
  status: MembershipStatus;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ListMembersResult {
  total: number;
  memberships: MemberResult[];
}

export interface InviteMemberPayload {
  email: string;
  name: string;
  role: MembershipRole;
}

export interface ListMembersParams {
  workspaceId: string;
  page: number;
  limit: number;
}

export class WorkspaceService {
  static async getWorkspaceFromDB({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<WorkspaceResult> {
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
  ): Promise<WorkspaceResult> {
    const data: any = {};
    const settingsData: any = {};

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
    payload: InviteMemberPayload,
  ): Promise<MemberResult> {
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
    params: ListMembersParams,
  ): Promise<ListMembersResult> {
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

  static async deactivateMemberIntoDB(membershipId: string): Promise<MemberResult> {
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
