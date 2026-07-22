import type { AttendanceStatus } from './api-client';

/** Display labels — "Informed" reads better than the underlying "EXCUSED"
 * enum value (kept as-is on the backend to avoid a schema change), meaning
 * the student let someone know ahead of time they wouldn't attend. */
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  EXCUSED: 'Informed',
};

export function attendanceStatusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_STATUS_LABELS[status];
}

/** The statuses a mentor/CR can manually set. LATE is excluded — it's
 * derived automatically from how late a self check-in came in, not
 * something a person picks. */
export const MANUAL_ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'EXCUSED',
];
