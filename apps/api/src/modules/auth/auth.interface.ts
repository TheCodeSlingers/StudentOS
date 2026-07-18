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

export interface IAuthResult {
  response: {
    token: string;
    user: { id: string; email: string; name: string };
  };
  headers: {
    forEach(callbackfn: (value: string, key: string) => void, thisArg?: unknown): void;
  };
}
