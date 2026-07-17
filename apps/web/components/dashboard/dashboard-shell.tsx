"use client";

import { ReactNode, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./sidebar";
import { NavItem } from "./nav/types";
import styles from "./dashboard-shell.module.css";

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

interface DashboardShellProps {
  navItems: NavItem[];
  footerAction?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome (sidebar + header + content area) for every role's dashboard layout.
 * Role layouts (see components/dashboard/layouts) own the nav items and any
 * role-specific footer action/modal — this component only knows how to render them.
 */
export function DashboardShell({ navItems, footerAction, children }: DashboardShellProps) {
  const { user, workspaceName } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} navItems={navItems} footerAction={footerAction} />

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
    </div>
  );
}
