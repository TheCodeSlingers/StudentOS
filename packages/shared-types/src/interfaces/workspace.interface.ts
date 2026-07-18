import { MembershipRole, MembershipStatus } from "@prisma/client";

export interface IWorkspaceResult {
  id: string;
  name: string;
  timezone: string;
  settings: {
    defaultAttendanceDurationMins: number;
    lateThresholdMins: number;
  };
}

export interface IMemberResult {
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

export interface IListMembersResult {
  total: number;
  memberships: IMemberResult[];
}

export interface IInviteMemberPayload {
  email: string;
  name: string;
  role: MembershipRole;
}

export interface IListMembersParams {
  workspaceId: string;
  page: number;
  limit: number;
}
