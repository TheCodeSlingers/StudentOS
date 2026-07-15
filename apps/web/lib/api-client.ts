const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthOrganization {
  id: string;
  name: string;
}

export interface AuthResult {
  user: AuthUser;
  organization?: AuthOrganization;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      payload?.error?.code
    );
  }

  return payload.data as T;
}

function getJson<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function login(payload: LoginPayload): Promise<AuthResult> {
  return postJson<AuthResult>("/auth/login", payload);
}

export function signup(payload: SignupPayload): Promise<AuthResult> {
  return postJson<AuthResult>("/auth/signup", payload);
}

export interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  isArchived: boolean;
  lateThresholdMinsOverride: number | null;
  attendanceDurationMinsOverride: number | null;
}

export type SessionStatus = "SCHEDULED" | "STARTED" | "ENDED" | "CANCELLED";

export interface SessionSummary {
  id: string;
  batchId: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetLink: string | null;
  status: SessionStatus;
  attendanceOpenedAt: string | null;
  attendanceClosedAt: string | null;
  currentCode: string | null;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceMethod = "SELF_SUBMITTED" | "MANUAL";

export interface AttendanceRosterItem {
  studentBatchMembershipId: string;
  userId: string;
  name: string;
  email: string;
  isCR: boolean;
  attendance: {
    id: string;
    status: AttendanceStatus;
    method: AttendanceMethod;
    submittedAt: string | null;
    manualReason: string | null;
    markedBy: { id: string; name: string } | null;
  } | null;
}

export function listBatches(): Promise<Batch[]> {
  return getJson<Batch[]>("/batches");
}

export function listSessions(batchId: string): Promise<SessionSummary[]> {
  return getJson<SessionSummary[]>(`/batches/${batchId}/sessions`);
}

export function openAttendanceWindow(sessionId: string): Promise<SessionSummary> {
  return postJson<SessionSummary>(`/sessions/${sessionId}/attendance/open`, {});
}

export function closeAttendanceWindow(sessionId: string): Promise<SessionSummary> {
  return postJson<SessionSummary>(`/sessions/${sessionId}/attendance/close`, {});
}

export function getSessionRoster(sessionId: string): Promise<AttendanceRosterItem[]> {
  return getJson<AttendanceRosterItem[]>(`/sessions/${sessionId}/attendance`);
}

export interface ManualMarkPayload {
  studentBatchMembershipId: string;
  status: AttendanceStatus;
  manualReason: string;
}

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  submittedAt?: string;
}

export function manualMarkAttendance(sessionId: string, payload: ManualMarkPayload): Promise<AttendanceRecord> {
  return postJson<AttendanceRecord>(`/sessions/${sessionId}/attendance/manual`, payload);
}

export function submitAttendance(sessionId: string, code: string): Promise<AttendanceRecord> {
  return postJson<AttendanceRecord>(`/sessions/${sessionId}/attendance/submit`, { code });
export type MembershipRole = "MENTOR" | "STUDENT";

export interface InviteMemberPayload {
  email: string;
  name: string;
  role: MembershipRole;
}

export interface InviteMemberResult {
  membershipId: string;
  role: MembershipRole;
  status: "ACTIVE" | "INVITED";
  user: AuthUser;
}

export function inviteMember(payload: InviteMemberPayload): Promise<InviteMemberResult> {
  return postJson<InviteMemberResult>("/workspace/members/invite", payload);
}
