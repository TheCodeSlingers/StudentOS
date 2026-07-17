import {
  AnalyticsIcon,
  AttendanceIcon,
  BatchesIcon,
  DashboardIcon,
  MembersIcon,
  SessionsIcon,
  SettingsIcon,
  StudentsIcon,
} from "./icons";
import { NavItem } from "./types";

export const MENTOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Batches", href: "/dashboard/batches", icon: BatchesIcon },
  { label: "Students", href: "/dashboard/students", icon: StudentsIcon },
  { label: "Sessions", href: "/dashboard/sessions", icon: SessionsIcon },
  { label: "Attendance", href: "/dashboard/attendance", icon: AttendanceIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: AnalyticsIcon },
  { label: "Members", href: "/dashboard/members", icon: MembersIcon },
  { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];
