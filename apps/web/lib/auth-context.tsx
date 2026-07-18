"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  CRBatchSummary,
  LoginPayload,
  SignupPayload,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
} from "./api-client";
import { clearStoredToken, getStoredToken, setStoredToken } from "./session";
import { notify } from "./toast";

export type MembershipRole = "MENTOR" | "STUDENT";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  role: MembershipRole | null;
  membershipId: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  isCR: boolean;
  crBatches: CRBatchSummary[];
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<AuthState>;
  signup: (payload: SignupPayload) => Promise<AuthState>;
  logout: () => Promise<void>;
}

const INITIAL_STATE: AuthState = {
  status: "loading",
  user: null,
  role: null,
  membershipId: null,
  workspaceId: null,
  workspaceName: null,
  isCR: false,
  crBatches: [],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const refresh = useCallback(async (): Promise<AuthState> => {
    const token = getStoredToken();
    if (!token) {
      const next: AuthState = { ...INITIAL_STATE, status: "unauthenticated" };
      setState(next);
      return next;
    }

    try {
      const me = await getCurrentUser();
      const active = me.memberships.find((m) => m.workspaceId === me.activeWorkspaceId) ?? me.memberships[0];

      const next: AuthState = {
        status: "authenticated",
        user: me.user,
        role: active?.role ?? null,
        membershipId: active?.membershipId ?? null,
        workspaceId: active?.workspaceId ?? null,
        workspaceName: active?.workspaceName ?? null,
        isCR: active?.isCR ?? false,
        crBatches: active?.crBatches ?? [],
      };
      setState(next);
      return next;
    } catch {
      clearStoredToken();
      const next: AuthState = { ...INITIAL_STATE, status: "unauthenticated" };
      setState(next);
      return next;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await apiLogin(payload);
      setStoredToken(result.accessToken);
      return refresh();
    },
    [refresh]
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      try {
        const result = await apiSignup(payload);
        setStoredToken(result.accessToken);
        const next = await refresh();
        notify.success("Account created successfully!");
        return next;
      } catch (error) {
        notify.error(error, "Could not sign up.");
        throw error;
      }
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    clearStoredToken();
    setState({ ...INITIAL_STATE, status: "unauthenticated" });
  }, []);

  return <AuthContext.Provider value={{ ...state, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
