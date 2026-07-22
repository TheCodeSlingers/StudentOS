'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import importStyles from './import-modal.module.css';
import styles from './modal.module.css';

import { Button } from '@/components/ui/Button';
import type { AttendanceImportSummary } from '@/lib/api-client';
import { ApiError, importSessionAttendance } from '@/lib/api-client';
import { detectCsvHeaders } from '@/lib/csv';

interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onImported: () => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function downloadTemplate() {
  const header = 'email,status';
  const example = 'jane@example.com,Present\njohn@example.com,Absent';
  const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'attendance-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Best-effort guesses so a well-formed CSV (like the downloadable template)
 * can be uploaded without the mentor having to touch the dropdowns — but
 * real-world exports (a session date as the status column, "Your Email",
 * etc.) still work since the mentor can always override the guess. */
function guessColumn(headers: string[], keywords: string[]): string {
  for (const keyword of keywords) {
    const match = headers.find((h) => h.toLowerCase().includes(keyword));
    if (match) return match;
  }
  return '';
}

export function AttendanceImportModal({
  isOpen,
  onClose,
  sessionId,
  onImported,
}: AttendanceImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [emailColumn, setEmailColumn] = useState('');
  const [statusColumn, setStatusColumn] = useState('');
  const [summary, setSummary] = useState<AttendanceImportSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) return;
    setFile(null);
    setHeaders([]);
    setEmailColumn('');
    setStatusColumn('');
    setSummary(null);
    setIsUploading(false);
    setError(null);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setHeaders([]);
    setEmailColumn('');
    setStatusColumn('');

    if (!selected) return;

    try {
      const text = await selected.text();
      const detected = detectCsvHeaders(text);
      if (detected.length === 0) {
        setError('Could not find a header row in this CSV.');
        return;
      }
      setHeaders(detected);
      setEmailColumn(guessColumn(detected, ['email']));
      setStatusColumn(guessColumn(detected, ['status', 'attendance', 'present']));
    } catch {
      setError('Could not read this CSV file.');
    }
  }

  async function handleUpload() {
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    if (!emailColumn || !statusColumn) {
      setError('Choose which column holds the email and which holds attendance status.');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const result = await importSessionAttendance(sessionId, file, emailColumn, statusColumn);
      setSummary(result);
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError ? uploadError.message : 'Could not import attendance.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleDone() {
    if (summary && summary.successRows > 0) {
      onImported();
    }
    onClose();
  }

  const failedRows = summary?.rows.filter((row) => row.status !== 'SUCCESS') ?? [];

  return (
    <div className={styles.overlay} onClick={isUploading ? undefined : onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-import-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="attendance-import-modal-title" className={styles.title}>
              Import attendance
            </h2>
            <p className={styles.subtitle}>
              Bulk-mark attendance for this session from a CSV file.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={isUploading ? undefined : onClose}
            aria-label="Close dialog"
            disabled={isUploading}
          >
            <CloseIcon />
          </button>
        </div>

        {error ? (
          <div className={styles.banner} role="alert">
            {error}
          </div>
        ) : null}

        {!summary ? (
          <div className={styles.form}>
            <p className={styles.hint}>
              Upload any CSV with an email column and an attendance column — the status column
              doesn&apos;t have to be named &quot;status&quot; (e.g. a session date column works
              fine). You&apos;ll pick which column is which below. Status accepts{' '}
              <strong>Present</strong>, <strong>Absent</strong>, or <strong>Informed</strong> — a
              blank cell is treated as Absent.
            </p>

            <button type="button" className={importStyles.templateLink} onClick={downloadTemplate}>
              Download CSV template
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className={importStyles.fileInput}
            />
            {file ? <p className={importStyles.fileName}>{file.name}</p> : null}

            {headers.length > 0 ? (
              <>
                <div className={styles.fieldGroup}>
                  <label htmlFor="attendance-import-email-column">Email column</label>
                  <select
                    id="attendance-import-email-column"
                    className={styles.select}
                    value={emailColumn}
                    onChange={(event) => setEmailColumn(event.target.value)}
                  >
                    <option value="">Select a column…</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="attendance-import-status-column">Status column</label>
                  <select
                    id="attendance-import-status-column"
                    className={styles.select}
                    value={statusColumn}
                    onChange={(event) => setStatusColumn(event.target.value)}
                  >
                    <option value="">Select a column…</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={!file || !emailColumn || !statusColumn}
              >
                Upload
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={importStyles.summary}>
              <p>
                <strong>{summary.successRows}</strong> of <strong>{summary.totalRows}</strong> rows
                marked successfully.
                {summary.failedRows > 0
                  ? ` ${summary.failedRows} row${summary.failedRows === 1 ? '' : 's'} failed.`
                  : ''}
              </p>

              {failedRows.length > 0 ? (
                <ul className={importStyles.rowList}>
                  {failedRows.map((row) => (
                    <li key={`${row.rowNumber}-${row.email}`} className={importStyles.rowItem}>
                      <span className={importStyles.rowNumber}>Row {row.rowNumber}</span>
                      <span className={importStyles.rowEmail}>{row.email || '(no email)'}</span>
                      <span className={importStyles.rowError}>{row.errorMessage}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className={styles.actions}>
              <Button type="button" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
