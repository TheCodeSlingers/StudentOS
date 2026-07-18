"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, Batch, BatchPayload, createBatch, updateBatch } from "@/lib/api-client";
import { notify } from "@/lib/toast";
import styles from "./modal.module.css";

interface BatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal edits this batch instead of creating a new one. */
  batch?: Batch | null;
  onSaved: (batch: Batch) => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function BatchFormModal({ isOpen, onClose, batch, onSaved }: BatchFormModalProps) {
  const isEditing = Boolean(batch);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lateThreshold, setLateThreshold] = useState("");
  const [attendanceDuration, setAttendanceDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(batch?.name ?? "");
    setStartDate(toDateInputValue(batch?.startDate));
    setEndDate(toDateInputValue(batch?.endDate));
    setLateThreshold(batch?.lateThresholdMinsOverride != null ? String(batch.lateThresholdMinsOverride) : "");
    setAttendanceDuration(
      batch?.attendanceDurationMinsOverride != null ? String(batch.attendanceDurationMinsOverride) : ""
    );
    setIsSubmitting(false);
  }, [isOpen, batch]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      notify.error("Name is required.");
      return;
    }
    if (!startDate) {
      notify.error("Start date is required.");
      return;
    }

    const payload: BatchPayload = {
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      lateThresholdMinsOverride: lateThreshold ? Number(lateThreshold) : null,
      attendanceDurationMinsOverride: attendanceDuration ? Number(attendanceDuration) : null,
    };

    setIsSubmitting(true);
    try {
      const result = isEditing && batch ? await updateBatch(batch.id, payload) : await createBatch(payload);
      notify.success(isEditing ? "Batch updated successfully." : "Batch created successfully.");
      onSaved(result);
      onClose();
    } catch (error) {
      notify.error(error, "Could not save this batch.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="batch-form-title" className={styles.title}>
              {isEditing ? "Edit batch" : "Create a batch"}
            </h2>
            <p className={styles.subtitle}>
              {isEditing ? "Update this batch's schedule and overrides." : "Set up a new batch for your workspace."}
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField label="Batch name" value={name} onChange={(event) => setName(event.target.value)} />

          <div className={styles.fieldRow}>
            <TextField
              label="Start date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <TextField
              label="End date (optional)"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <TextField
              label="Late threshold (mins)"
              type="number"
              min={0}
              placeholder="Workspace default"
              value={lateThreshold}
              onChange={(event) => setLateThreshold(event.target.value)}
            />
            <TextField
              label="Attendance duration (mins)"
              type="number"
              min={1}
              placeholder="Workspace default"
              value={attendanceDuration}
              onChange={(event) => setAttendanceDuration(event.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? "Save changes" : "Create batch"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
