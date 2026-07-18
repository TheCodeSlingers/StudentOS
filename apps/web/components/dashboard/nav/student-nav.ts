import { AttendanceIcon, BatchesIcon, DashboardIcon, MembersIcon, SessionsIcon } from "./icons";
import { NavItem } from "./types";

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: DashboardIcon },
  { label: "My batches", href: "/dashboard/my-batches", icon: BatchesIcon },
  { label: "My sessions", href: "/dashboard/my-sessions", icon: SessionsIcon },
  { label: "Check-in", href: "/dashboard/checkin", icon: AttendanceIcon },
  { label: "My attendance", href: "/dashboard/my-attendance", icon: AttendanceIcon },
  { label: "Profile", href: "/dashboard/profile", icon: MembersIcon },
];

/** Extra nav items unlocked when the student is a Class Representative for at least one batch. */
export const STUDENT_CR_NAV_ITEMS: NavItem[] = [
  { label: "Manage sessions", href: "/dashboard/cr/sessions", icon: SessionsIcon },
];

export function getStudentNavItems(isCR: boolean): NavItem[] {
  return isCR ? [...STUDENT_NAV_ITEMS, ...STUDENT_CR_NAV_ITEMS] : STUDENT_NAV_ITEMS;
}
