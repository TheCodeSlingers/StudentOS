"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "../dashboard-shell";
import { getStudentNavItems } from "../nav/student-nav";

export function StudentLayout({ children }: { children: ReactNode }) {
  const { isCR } = useAuth();

  return <DashboardShell navItems={getStudentNavItems(isCR)}>{children}</DashboardShell>;
}
