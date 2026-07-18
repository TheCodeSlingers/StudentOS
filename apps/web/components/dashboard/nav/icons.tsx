import { NavIconProps } from "./types";

export function DashboardIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function BatchesIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l7 3.5L10 10 3 6.5 10 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 10.5L10 14l7-3.5M3 14.5L10 18l7-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StudentsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 16.5c.4-2.7 2.2-4.3 4.5-4.3s4.1 1.6 4.5 4.3M12 16.5c.3-2 1.6-3.4 3.3-3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SessionsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AttendanceIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.8 10.2l2.2 2.2 4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MembersIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 17c.5-3.3 2.6-5.2 5.5-5.2s5 1.9 5.5 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 4.3c1.3.4 2.2 1.5 2.2 3s-.9 2.6-2.2 3M15.8 11.9c1.6.6 2.6 1.9 2.9 4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: NavIconProps) {
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

export function AnalyticsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 17h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 14v-4M10.5 14V7M14.5 14v-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
