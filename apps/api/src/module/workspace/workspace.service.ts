import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const getWorkspace = async ({ workspaceId }: { workspaceId: string }) => {
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
};

const updateWorkspaceSettings = async (
  workspaceId: string,
  payload: {
    timezone?: string;
    defaultAttendanceDurationMins?: number;
    lateThresholdMins?: number;
  },
) => {
  const data: any = {};
  const settingsData: any = {};

  if (payload.timezone !== undefined) {
    data.timezone = payload.timezone;
  }

  if (payload.defaultAttendanceDurationMins !== undefined) {
    settingsData.defaultAttendanceDurationMins =
      payload.defaultAttendanceDurationMins;
  }

  if (payload.lateThresholdMins !== undefined) {
    settingsData.lateThresholdMins = payload.lateThresholdMins;
  }

  const shouldUpdateWorkspace = Object.keys(data).length > 0;
  const shouldUpdateSettings = Object.keys(settingsData).length > 0;

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
};

const inviteMember = async (
  workspaceId: string,
  payload: {
    email: string;
    name: string;
    role: MembershipRole;
  },
) => {
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
};

const listMembers = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

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
      take: limit,
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
};

const deactivateMember = async (membershipId: string) => {
  const membership = await prisma.membership.update({
    where: {
      id: membershipId,
    },
    data: {
      status: MembershipStatus.INACTIVE,
    },
  });

  return membership;
};

export const WorkspaceService = {
  getWorkspace,
  updateWorkspaceSettings,
  inviteMember,
  listMembers,
  deactivateMember,
};
