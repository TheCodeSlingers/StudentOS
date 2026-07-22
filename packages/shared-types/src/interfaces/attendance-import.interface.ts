export type AttendanceImportRowStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface IAttendanceImportRowResult {
  rowNumber: number;
  email: string;
  status: AttendanceImportRowStatus;
  errorMessage: string | null;
}

export interface IAttendanceImportSummary {
  sessionId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  rows: IAttendanceImportRowResult[];
}
