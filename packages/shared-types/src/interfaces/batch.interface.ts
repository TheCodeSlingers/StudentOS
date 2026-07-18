export interface ICreateBatchPayload {
  name: string;
  startDate: string;
  endDate?: string | null;
  lateThresholdMinsOverride?: number | null;
  attendanceDurationMinsOverride?: number | null;
}

export interface IUpdateBatchPayload {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  lateThresholdMinsOverride?: number | null;
  attendanceDurationMinsOverride?: number | null;
}

export interface IAllocateMemberPayload {
  membershipId: string;
  isCR?: boolean;
}

export interface IUpdateBatchMembershipPayload {
  isCR?: boolean;
  revokedAt?: string | null;
}

export interface IBatchMetrics {
  totalStudents: number;
  totalCRs: number;
  totalSessions: number;
}

export interface IBatchDetails {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  isArchived: boolean;
  lateThresholdMinsOverride: number | null;
  attendanceDurationMinsOverride: number | null;
  metrics: IBatchMetrics;
}

export interface IBatchResult {
  id: string;
  workspaceId: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  capacity: number | null;
  defaultMeetLink: string | null;
  isArchived: boolean;
  lateThresholdMinsOverride: number | null;
  attendanceDurationMinsOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBatchMemberResult {
  batchMembershipId: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isCR: boolean;
  assignedAt: Date;
}

export interface IBatchMembershipResult {
  id: string;
  membershipId: string;
  batchId: string;
  isCR: boolean;
  assignedAt: Date;
  revokedAt: Date | null;
}
