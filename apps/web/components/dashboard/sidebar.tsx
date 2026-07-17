"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { NavItem } from "./nav/types";
import styles from "./sidebar.module.css";

const DASHBOARD_HOME_HREF = "/dashboard";

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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  /** Optional role-specific action rendered above "Log out" (e.g. the mentor's "Invite member" button). */
  footerAction?: ReactNode;
}

/**
 * Presentational shell for the dashboard nav — takes whatever nav items it's given and
 * has no notion of role itself. Each role's layout (see components/dashboard/layouts)
 * owns picking the right items and footer action.
 */
export function Sidebar({ isOpen, onClose, navItems, footerAction }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

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
          {navItems.map((item) => {
            const isActive =
              item.href === DASHBOARD_HOME_HREF
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
          {footerAction}
          <button type="button" className={styles.logoutLink} onClick={handleLogout}>
            <LogoutIcon className={styles.linkIcon} />
            Log out
          </button>
        </div>
      </nav>
    </>
  );
}
