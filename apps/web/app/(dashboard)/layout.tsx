"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Sidebar } from "@/components/dashboard/sidebar";
import { InviteModal } from "@/components/modals/invite-modal";
import { useAuth } from "@/lib/auth-context";
import styles from "./layout.module.css";

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user, role, workspaceName } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onInviteMember={() => setIsInviteOpen(true)}
        role={role}
      />

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsNavOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          <div className={styles.mobileBrand}>
            <Logo variant="mark" size={24} />
          </div>

          {workspaceName ? <span className={styles.workspaceName}>{workspaceName}</span> : null}

          <div className={styles.headerSpacer} />

          {user ? (
            <span className={styles.avatar} title={user.name}>
              {initials(user.name)}
            </span>
          ) : null}
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
