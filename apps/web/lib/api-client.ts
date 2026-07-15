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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export function login(payload: LoginPayload): Promise<AuthResult> {
  return postJson<AuthResult>("/auth/login", payload);
}

export function signup(payload: SignupPayload): Promise<AuthResult> {
  return postJson<AuthResult>("/auth/signup", payload);
}

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
