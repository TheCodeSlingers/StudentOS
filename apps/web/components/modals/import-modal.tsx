"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  ApiError,
  UpdateStudentProfilePayload,
  enrollStudent,
  inviteMember,
  updateStudentProfile,
} from "@/lib/api-client";
import { StudentCsvRow, buildStudentCsvTemplate, parseStudentCsvFile } from "@/lib/csv";
import styles from "./modal.module.css";
import importStyles from "./import-modal.module.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onImported: () => void;
}

type ProblemStatus = "FAILED" | "SKIPPED";

interface ProblemRow {
  rowNumber: number;
  email: string;
  status: ProblemStatus;
  message: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries a request once or twice on 429 (rate limited) before giving up —
 * bulk imports fire many sequential requests and shouldn't fail outright
 * just because they briefly tripped the rate limiter. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
}

function buildProfilePayload(row: StudentCsvRow): UpdateStudentProfilePayload {
  const payload: UpdateStudentProfilePayload = {};
  if (row.phone) payload.phone = row.phone;
  if (row.courseName) payload.courseName = row.courseName;
  if (row.specialization) payload.specialization = row.specialization;
  if (row.skills && row.skills.length > 0) payload.skills = row.skills;
  return payload;
}

function downloadTemplate() {
  const blob = new Blob([buildStudentCsvTemplate()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportModal({ isOpen, onClose, batchId, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [total, setTotal] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [problemRows, setProblemRows] = useState<ProblemRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) return;
    setFile(null);
    setError(null);
    setIsProcessing(false);
    setIsDone(false);
    setTotal(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setProblemRows([]);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  function recordFailure(row: StudentCsvRow, message: string) {
    setFailedCount((count) => count + 1);
    setProblemRows((current) => [...current, { rowNumber: row.rowNumber, email: row.email, status: "FAILED", message }]);
  }

  function recordSkipped(row: StudentCsvRow, message: string) {
    setSkippedCount((count) => count + 1);
    setProblemRows((current) => [...current, { rowNumber: row.rowNumber, email: row.email, status: "SKIPPED", message }]);
  }

  async function processRow(row: StudentCsvRow) {
    if (row.validationError) {
      recordFailure(row, row.validationError);
      setProcessedCount((count) => count + 1);
      return;
    }

    try {
      const member = await withRetry(() => inviteMember({ name: row.name, email: row.email, role: "STUDENT" }));

      try {
        await withRetry(() => enrollStudent(batchId, member.id));
      } catch (enrollError) {
        if (enrollError instanceof ApiError && /already enrolled/i.test(enrollError.message)) {
          recordSkipped(row, "Already enrolled in this batch.");
          return;
        }
        throw enrollError;
      }

      const profilePayload = buildProfilePayload(row);
      if (Object.keys(profilePayload).length > 0) {
        await withRetry(() => updateStudentProfile(member.id, profilePayload)).catch(() => {
          // Enrollment already succeeded — a missed profile detail isn't worth failing the row over.
        });
      }

      setSuccessCount((count) => count + 1);
    } catch (rowError) {
      recordFailure(row, rowError instanceof ApiError ? rowError.message : "Could not enroll this student.");
    } finally {
      setProcessedCount((count) => count + 1);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setError(null);
    let rows: StudentCsvRow[];
    try {
      rows = await parseStudentCsvFile(file);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Could not read this CSV file.");
      return;
    }

    if (rows.length === 0) {
      setError("This CSV file has no data rows.");
      return;
    }

    setIsProcessing(true);
    setTotal(rows.length);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setProblemRows([]);

    // Sequential, not parallel — this fires 1-3 real requests per row, and
    // staying sequential keeps a large roster well under the API's rate
    // limit instead of bursting it all at once.
    for (const row of rows) {
      await processRow(row);
    }

    setIsProcessing(false);
    setIsDone(true);
  }

  function handleDone() {
    if (successCount > 0) {
      onImported();
    }
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={isProcessing ? undefined : onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="import-modal-title" className={styles.title}>
              Import students
            </h2>
            <p className={styles.subtitle}>Bulk-enroll students into this batch from a CSV file.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={isProcessing ? undefined : onClose}
            aria-label="Close dialog"
            disabled={isProcessing}
          >
            <CloseIcon />
          </button>
        </div>

        {error ? (
          <div className={styles.banner} role="alert">
            {error}
          </div>
        ) : null}

        {!isProcessing && !isDone ? (
          <div className={styles.form}>
            <p className={styles.hint}>
              CSV must include <strong>email</strong> and <strong>name</strong> columns. <strong>phone</strong>,{" "}
              <strong>courseName</strong>, <strong>specialization</strong>, and <strong>skills</strong> (comma-separated,
              wrap in quotes) are optional.
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

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpload} disabled={!file}>
                Upload
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            {!isDone ? (
              <div className={importStyles.progress}>
                <span className={importStyles.spinner} aria-hidden="true" />
                <p>
                  Processing… {processedCount} of {total} rows ({successCount} enrolled
                  {skippedCount > 0 ? `, ${skippedCount} skipped` : ""}
                  {failedCount > 0 ? `, ${failedCount} failed` : ""})
                </p>
              </div>
            ) : (
              <div className={importStyles.summary}>
                <p>
                  <strong>{successCount}</strong> of <strong>{total}</strong> rows enrolled successfully.
                  {skippedCount > 0 ? ` ${skippedCount} already enrolled (skipped).` : ""}
                  {failedCount > 0 ? ` ${failedCount} row${failedCount === 1 ? "" : "s"} failed.` : ""}
                </p>

                {problemRows.length > 0 ? (
                  <ul className={importStyles.rowList}>
                    {problemRows.map((row) => (
                      <li key={`${row.rowNumber}-${row.email}`} className={importStyles.rowItem}>
                        <span className={importStyles.rowNumber}>Row {row.rowNumber}</span>
                        <span className={importStyles.rowEmail}>{row.email || "(no email)"}</span>
                        <span className={importStyles.rowError} data-tone={row.status === "SKIPPED" ? "neutral" : "danger"}>
                          {row.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}

            <div className={styles.actions}>
              <Button type="button" onClick={handleDone} disabled={!isDone} isLoading={!isDone}>
                {isDone ? "Done" : "Working…"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
