export interface ISignUpPayload {
  email: string;
  password: string;
  name: string;
  workspaceName?: string;
}

export interface ISignInPayload {
  email: string;
  password: string;
}

export interface IResetPasswordPayload {
  newPassword: string;
  token: string;
}

export type TAuthHeaders = Record<string, string | string[] | undefined>;

export interface ISignUpResult {
  headers: Headers;
  data: {
    user: { id: string; email: string; name: string };
    workspace: { id: string; name: string };
    accessToken: string;
    refreshToken: string;
  };
}

export interface ISignInResult {
  headers: Headers;
  data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  };
}

export interface IRefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface IGetMeResult {
  user: { id: string; email: string; name: string };
  activeWorkspaceId: string | null;
  memberships: Array<{
    workspaceId: string;
    workspaceName: string;
    role: string;
  }>;
}
