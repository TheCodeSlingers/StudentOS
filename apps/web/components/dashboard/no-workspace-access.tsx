"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import styles from "./no-workspace-access.module.css";

/**
 * Shown when a session is valid but resolves to zero active workspace memberships
 * (e.g. a removed member signing back in). Distinct from "unauthenticated" — the
 * user is logged in, they just don't have anywhere in the app to land.
 */
export function NoWorkspaceAccess() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Logo variant="mark" size={32} />
        <h1>No workspace access</h1>
        <p>
          Your account isn&apos;t an active member of any workspace right now. Ask a mentor to invite you again, or
          sign in with a different account.
        </p>
        <Button type="button" onClick={handleLogout} style={{ width: "auto" }}>
          Log out
        </Button>
      </div>
    </div>
  );
}
