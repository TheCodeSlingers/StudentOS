import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type {
  InviteMemberInput,
  ListMembersInput,
  UpdateMembershipStatusInput,
} from "./workspace.schema";

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

export class WorkspaceService {
  static async getWorkspace({
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

  static async updateWorkspaceSettings(
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

    const shouldUpdateWorkspace = Object.keys(data).length > 0;

    const workspaceResult = shouldUpdateWorkspace
      ? await prisma.workspace.update({
          where: { id: workspaceId },
          data,
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        })
      : await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        });

    const settingsResult = await prisma.workspaceSettings.upsert({
      where: { workspaceId: workspaceId },
      create: {
        workspaceId: workspaceId,
        defaultAttendanceDurationMins:
          settingsData.defaultAttendanceDurationMins ?? 15,
        lateThresholdMins: settingsData.lateThresholdMins ?? 10,
      },
      update: settingsData,
      select: {
        defaultAttendanceDurationMins: true,
        lateThresholdMins: true,
      },
    });

    if (!workspaceResult) {
      throw new Error("Active workspace not found");
    }

    return {
      id: workspaceResult.id,
      name: workspaceResult.name,
      timezone: workspaceResult.timezone,
      settings: {
        defaultAttendanceDurationMins:
          settingsResult.defaultAttendanceDurationMins,
        lateThresholdMins: settingsResult.lateThresholdMins,
      },
    };
  }

  static async inviteMember(
    workspaceId: string,
    payload: InviteMemberInput["body"],
  ): Promise<MemberResult> {
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name },
      create: { email: payload.email, name: payload.name },
    });

    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        role: payload.role,
      },
      include: {
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
      include: {
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

  static async listMembers(
    params: ListMembersInput["query"],
  ): Promise<ListMembersResult> {
    const skip = (params.page - 1) * params.limit;

    const [total, memberships] = await Promise.all([
      prisma.membership.count({
        where: {
          status: MembershipStatus.ACTIVE,
        },
      }),
      prisma.membership.findMany({
        where: {
          status: MembershipStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
        include: {
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

  static async deactivateMember(membershipId: string): Promise<MemberResult> {
    const membership = await prisma.membership.update({
      where: {
        id: membershipId,
      },
      data: {
        status: MembershipStatus.INACTIVE,
      },
      include: {
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
