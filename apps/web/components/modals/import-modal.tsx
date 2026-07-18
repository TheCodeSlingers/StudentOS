"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  ApiError,
  ImportJobRow,
  ImportJobSummary,
  getImportJobRows,
  getImportJobSummary,
  importStudentRoster,
} from "@/lib/api-client";
import styles from "./modal.module.css";
import importStyles from "./import-modal.module.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onImported: () => void;
}

const POLL_INTERVAL_MS = 1500;

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ImportModal({ isOpen, onClose, batchId, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJobSummary | null>(null);
  const [rows, setRows] = useState<ImportJobRow[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) return;
    setFile(null);
    setJob(null);
    setRows(null);
    setIsUploading(false);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!job || (job.status !== "PENDING" && job.status !== "PROCESSING")) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      getImportJobSummary(batchId, job.id)
        .then((result) => {
          if (!cancelled) setJob(result);
        })
        .catch((fetchError) => {
          if (!cancelled) setError(fetchError instanceof ApiError ? fetchError.message : "Could not check import progress.");
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job, batchId]);

  useEffect(() => {
    if (!job || job.status !== "COMPLETED_WITH_ERRORS") {
      return;
    }
    let cancelled = false;
    getImportJobRows(batchId, job.id)
      .then((result) => {
        if (!cancelled) setRows(result.filter((row) => row.status !== "SUCCESS"));
      })
      .catch(() => {
        // Row-level detail is a bonus; the summary counts already tell the important story.
      });
    return () => {
      cancelled = true;
    };
  }, [job, batchId]);

  if (!isOpen) {
    return null;
  }

  const isDone = job?.status === "COMPLETED" || job?.status === "COMPLETED_WITH_ERRORS";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const result = await importStudentRoster(batchId, file);
      setJob(result);
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : "Could not start the import.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDone() {
    if (job && (job.successRows > 0 || job.status === "COMPLETED")) {
      onImported();
    }
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={isUploading ? undefined : onClose}>
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
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>

        {error ? (
          <div className={styles.banner} role="alert">
            {error}
          </div>
        ) : null}

        {!job ? (
          <div className={styles.form}>
            <p className={styles.hint}>
              CSV must include <strong>email</strong> and <strong>name</strong> columns. <strong>phone</strong>,{" "}
              <strong>courseName</strong>, <strong>specialization</strong>, and <strong>skills</strong> (comma-separated)
              are optional.
            </p>

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
              <Button type="button" onClick={handleUpload} isLoading={isUploading} disabled={!file}>
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
                  {job.status === "PENDING" ? "Queued…" : "Processing…"}
                  {job.totalRows > 0 ? ` ${job.successRows + job.failedRows} of ${job.totalRows} rows` : null}
                </p>
              </div>
            ) : (
              <div className={importStyles.summary}>
                <p>
                  <strong>{job.successRows}</strong> of <strong>{job.totalRows}</strong> rows imported successfully.
                  {job.failedRows > 0 ? ` ${job.failedRows} row${job.failedRows === 1 ? "" : "s"} failed.` : ""}
                </p>

                {rows && rows.length > 0 ? (
                  <ul className={importStyles.rowList}>
                    {rows.map((row) => (
                      <li key={row.id} className={importStyles.rowItem}>
                        <span className={importStyles.rowNumber}>Row {row.rowNumber}</span>
                        <span className={importStyles.rowEmail}>{row.email}</span>
                        <span className={importStyles.rowError}>{row.errorMessage ?? row.status}</span>
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
