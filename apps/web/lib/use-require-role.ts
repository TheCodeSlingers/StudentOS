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
