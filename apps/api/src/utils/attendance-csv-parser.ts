import { BadRequestError } from '../common/errors';

export type AttendanceCSVStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface AttendanceCSVRow {
  rowNumber: number;
  email: string;
  /** null when the status cell didn't match a recognized value — the row is
   * still returned so the caller can report a per-row error instead of
   * failing the whole import. */
  status: AttendanceCSVStatus | null;
  rawStatus: string;
}

/** Matches the 3 statuses exposed to mentors (Present/Absent/Informed) —
 * "informed" and "excused" both map to the same underlying EXCUSED value
 * (kept as-is on the backend to avoid a schema change). "late" isn't
 * accepted here since it's derived automatically from self check-in
 * timing, not something a CSV row sets. */
const STATUS_ALIASES: Record<string, AttendanceCSVStatus> = {
  present: 'PRESENT',
  absent: 'ABSENT',
  informed: 'EXCUSED',
  excused: 'EXCUSED',
};

export interface ParseAttendanceCSVOptions {
  /** Header name of the email column, as it literally appears in the CSV's
   * header row (case-insensitive). Real-world attendance sheets rarely
   * label this column "status" — it's often the session date (e.g. "29
   * Jun") — so the caller (the mentor, via the frontend's column picker)
   * identifies both columns explicitly rather than us guessing by name. */
  emailColumn: string;
  statusColumn: string;
}

/** Parses a session attendance CSV: same tokenizer as the student roster
 * parser, but reads whichever two columns the caller identifies as the
 * email/status columns. A blank status cell means absent, matching the
 * common attendance-sheet convention where only presence is marked. */
export function parseAttendanceCSV(
  buffer: Buffer,
  { emailColumn, statusColumn }: ParseAttendanceCSVOptions,
): AttendanceCSVRow[] {
  const content = buffer.toString('utf8');
  if (!content.trim()) {
    throw new BadRequestError('CSV file is empty', 'EMPTY_FILE');
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else if (char === '\r' && !inQuotes) {
      if (nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  const cleanRows = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (cleanRows.length === 0) {
    throw new BadRequestError('CSV file is empty', 'EMPTY_FILE');
  }

  const normalizedEmailColumn = emailColumn.trim().toLowerCase();
  const normalizedStatusColumn = statusColumn.trim().toLowerCase();

  // The header row isn't always row one — some exports have a title/banner
  // row above the real columns — so find the row that actually contains the
  // chosen email column instead of assuming it's first.
  const headerRowIndex = cleanRows.findIndex((row) =>
    row.some((cell) => cell.trim().toLowerCase() === normalizedEmailColumn),
  );
  if (headerRowIndex === -1) {
    throw new BadRequestError(
      "The selected email/status columns were not found in this CSV's header row.",
      'MISSING_HEADERS',
    );
  }

  const headers = cleanRows[headerRowIndex].map((h) => h.trim().toLowerCase());
  const emailIdx = headers.indexOf(normalizedEmailColumn);
  const statusIdx = headers.indexOf(normalizedStatusColumn);

  if (emailIdx === -1 || statusIdx === -1) {
    throw new BadRequestError(
      "The selected email/status columns were not found in this CSV's header row.",
      'MISSING_HEADERS',
    );
  }

  const results: AttendanceCSVRow[] = [];

  for (let i = headerRowIndex + 1; i < cleanRows.length; i++) {
    const values = cleanRows[i];
    const email = values[emailIdx]?.trim();
    if (!email) {
      continue;
    }

    const rawStatus = values[statusIdx]?.trim() ?? '';
    const status: AttendanceCSVStatus | null = rawStatus
      ? (STATUS_ALIASES[rawStatus.toLowerCase()] ?? null)
      : 'ABSENT';

    results.push({ rowNumber: i, email, status, rawStatus });
  }

  return results;
}
