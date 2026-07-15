"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import styles from "./sidebar.module.css";

interface NavItem {
  label: string;
  href: string;
  icon: (props: { className?: string }) => ReactElement;
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BatchesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l7 3.5L10 10 3 6.5 10 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 10.5L10 14l7-3.5M3 14.5L10 18l7-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 16.5c.4-2.7 2.2-4.3 4.5-4.3s4.1 1.6 4.5 4.3M12 16.5c.3-2 1.6-3.4 3.3-3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SessionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AttendanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.8 10.2l2.2 2.2 4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MembersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 17c.5-3.3 2.6-5.2 5.5-5.2s5 1.9 5.5 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 4.3c1.3.4 2.2 1.5 2.2 3s-.9 2.6-2.2 3M15.8 11.9c1.6.6 2.6 1.9 2.9 4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.8v1.8M10 15.4v1.8M17.2 10h-1.8M4.6 10H2.8M15 5l-1.3 1.3M6.3 13.7L5 15M15 15l-1.3-1.3M6.3 6.3L5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 17H4.8A1.8 1.8 0 013 15.2V4.8A1.8 1.8 0 014.8 3H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 13.5L17 10l-4-3.5M17 10H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/mentor", icon: DashboardIcon },
  { label: "Batches", href: "/mentor/batches", icon: BatchesIcon },
  { label: "Students", href: "/mentor/students", icon: StudentsIcon },
  { label: "Sessions", href: "/mentor/sessions", icon: SessionsIcon },
  { label: "Attendance", href: "/mentor/attendance", icon: AttendanceIcon },
  { label: "Members", href: "/mentor/members", icon: MembersIcon },
  { label: "Settings", href: "/mentor/settings", icon: SettingsIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteMember: () => void;
}

export function Sidebar({ isOpen, onClose, onInviteMember }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen ? <div className={styles.backdrop} onClick={onClose} aria-hidden="true" /> : null}

      <nav className={styles.sidebar} data-open={isOpen} aria-label="Dashboard navigation">
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close navigation">
          <CloseIcon />
        </button>

        <div className={styles.brand}>
          <Logo variant="full" inverse />
        </div>

        <ul className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} className={styles.link} data-active={isActive} onClick={onClose}>
                  <Icon className={styles.linkIcon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.footer}>
          <Button type="button" onClick={onInviteMember}>
            Invite member
          </Button>
          <Link href="/login" className={styles.logoutLink}>
            <LogoutIcon className={styles.linkIcon} />
            Log out
          </Link>
        </div>
      </nav>
    </>
  );
}
