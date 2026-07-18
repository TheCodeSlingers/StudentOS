"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardHomePage() {
  const { role } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        {role === "STUDENT"
          ? "Your batches and attendance overview will live here."
          : "Workspace overview will live here."}
      </p>
    </div>
  );
}
