"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { MentorLayout } from "@/components/dashboard/layouts/mentor-layout";
import { StudentLayout } from "@/components/dashboard/layouts/student-layout";
import { NoWorkspaceAccess } from "@/components/dashboard/no-workspace-access";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, role } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  // Authenticated, but zero active workspace memberships (e.g. a removed member) —
  // there's no role to build a nav around, so don't guess. Show a dedicated dead-end
  // instead of silently falling back into a Mentor shell that would 403 on every fetch.
  if (!role) {
    return <NoWorkspaceAccess />;
  }

  return role === "STUDENT" ? <StudentLayout>{children}</StudentLayout> : <MentorLayout>{children}</MentorLayout>;
}
