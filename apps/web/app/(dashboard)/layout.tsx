"use client";

import { ReactNode, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Sidebar } from "@/components/dashboard/sidebar";
import { InviteModal } from "@/components/modals/invite-modal";
import styles from "./layout.module.css";

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} onInviteMember={() => setIsInviteOpen(true)} />

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

          <div className={styles.headerSpacer} />

          <span className={styles.avatar} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3.5 17c.6-3.5 2.9-5.5 6.5-5.5s5.9 2 6.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
