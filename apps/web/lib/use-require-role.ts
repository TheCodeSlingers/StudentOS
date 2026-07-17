"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";
import type { MembershipRole } from "./auth-context";

export function useRequireRole(requiredRole: MembershipRole): boolean {
  const router = useRouter();
  const { status, role } = useAuth();

  useEffect(() => {
    if (status === "authenticated" && role !== requiredRole) {
      router.replace("/dashboard");
    }
  }, [status, role, requiredRole, router]);

  return status === "authenticated" && role === requiredRole;
}

/** Gates a page to students who are a Class Representative for at least one batch. */
export function useRequireCR(): boolean {
  const router = useRouter();
  const { status, role, isCR } = useAuth();
  const isAuthorized = role === "STUDENT" && isCR;

  useEffect(() => {
    if (status === "authenticated" && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [status, isAuthorized, router]);

  return status === "authenticated" && isAuthorized;
}
