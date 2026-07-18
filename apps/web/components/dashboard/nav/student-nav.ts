import { AttendanceIcon, DashboardIcon, MembersIcon, SessionsIcon } from "./icons";
import { NavItem } from "./types";

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: DashboardIcon },
  { label: "Check-in", href: "/dashboard/checkin", icon: AttendanceIcon },
  { label: "Profile", href: "/dashboard/profile", icon: MembersIcon },
];

/** Extra nav items unlocked when the student is a Class Representative for at least one batch. */
export const STUDENT_CR_NAV_ITEMS: NavItem[] = [
  { label: "Manage sessions", href: "/dashboard/cr/sessions", icon: SessionsIcon },
];

export function getStudentNavItems(isCR: boolean): NavItem[] {
  return isCR ? [...STUDENT_NAV_ITEMS, ...STUDENT_CR_NAV_ITEMS] : STUDENT_NAV_ITEMS;
}
