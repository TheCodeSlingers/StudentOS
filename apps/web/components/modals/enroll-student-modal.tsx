"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  ApiError,
  BatchStudent,
  HireStatus,
  JobType,
  UpdateStudentProfilePayload,
  WorkplacePreference,
  enrollStudent,
  inviteMember,
  updateStudentProfile,
} from "@/lib/api-client";
import { isValidEmail } from "@/lib/validation";
import styles from "./modal.module.css";

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onEnrolled: (student: BatchStudent) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  avatarUrl: "",
  courseName: "",
  specialization: "",
  skills: "",
  hireStatus: "STUDENT_ONLY" as HireStatus,
  jobType: "NOT_LOOKING" as JobType,
  workplacePreference: "NO_PREFERENCE" as WorkplacePreference,
  currentEmployer: "",
  currentPosition: "",
  portfolioUrl: "",
  linkedinUrl: "",
};

export function EnrollStudentModal({ isOpen, onClose, batchId, onEnrolled }: EnrollStudentModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.portfolioUrl.trim() && !isValidUrl(form.portfolioUrl.trim())) {
      nextErrors.portfolioUrl = "Enter a valid URL.";
    }
    if (form.linkedinUrl.trim() && !isValidUrl(form.linkedinUrl.trim())) {
      nextErrors.linkedinUrl = "Enter a valid URL.";
    }
    if (form.avatarUrl.trim() && !isValidUrl(form.avatarUrl.trim())) {
      nextErrors.avatarUrl = "Enter a valid URL.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const member = await inviteMember({ name: form.name.trim(), email: form.email.trim(), role: "STUDENT" });
      const enrolled = await enrollStudent(batchId, member.id);

      const profilePayload: UpdateStudentProfilePayload = {};
      if (form.phone.trim()) profilePayload.phone = form.phone.trim();
      if (form.address.trim()) profilePayload.address = form.address.trim();
      if (form.avatarUrl.trim()) profilePayload.avatarUrl = form.avatarUrl.trim();
      if (form.courseName.trim()) profilePayload.courseName = form.courseName.trim();
      if (form.specialization.trim()) profilePayload.specialization = form.specialization.trim();
      if (form.skills.trim()) {
        profilePayload.skills = form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
      }
      if (form.hireStatus !== EMPTY_FORM.hireStatus) profilePayload.hireStatus = form.hireStatus;
      if (form.jobType !== EMPTY_FORM.jobType) profilePayload.jobType = form.jobType;
      if (form.workplacePreference !== EMPTY_FORM.workplacePreference) {
        profilePayload.workplacePreference = form.workplacePreference;
      }
      if (form.currentEmployer.trim()) profilePayload.currentEmployer = form.currentEmployer.trim();
      if (form.currentPosition.trim()) profilePayload.currentPosition = form.currentPosition.trim();
      if (form.portfolioUrl.trim()) profilePayload.portfolioUrl = form.portfolioUrl.trim();
      if (form.linkedinUrl.trim()) profilePayload.linkedinUrl = form.linkedinUrl.trim();

      if (Object.keys(profilePayload).length > 0) {
        await updateStudentProfile(member.id, profilePayload);
      }

      onEnrolled(enrolled);
      onClose();
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : "Could not enroll this student.");
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
        aria-labelledby="enroll-student-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="enroll-student-title" className={styles.title}>
              Enroll a new student
            </h2>
            <p className={styles.subtitle}>Only name and email are required — everything else can be filled in later.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>

        {apiError ? (
          <div className={styles.banner} role="alert">
            {apiError}
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldRow}>
            <TextField label="Name" value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              error={errors.email}
            />
          </div>

          <div className={styles.fieldRow}>
            <TextField label="Phone (optional)" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            <TextField label="Address (optional)" value={form.address} onChange={(event) => update("address", event.target.value)} />
          </div>

          <div className={styles.fieldRow}>
            <TextField
              label="Course name (optional)"
              value={form.courseName}
              onChange={(event) => update("courseName", event.target.value)}
            />
            <TextField
              label="Specialization (optional)"
              value={form.specialization}
              onChange={(event) => update("specialization", event.target.value)}
            />
          </div>

          <TextField
            label="Technical skills (optional, comma separated)"
            placeholder="e.g. JavaScript, React, SQL"
            value={form.skills}
            onChange={(event) => update("skills", event.target.value)}
          />

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="enroll-hire-status">Hire status</label>
              <select
                id="enroll-hire-status"
                className={styles.select}
                value={form.hireStatus}
                onChange={(event) => update("hireStatus", event.target.value as HireStatus)}
              >
                <option value="STUDENT_ONLY">Student Only</option>
                <option value="JOB_SEEKING">Actively Looking</option>
                <option value="EMPLOYED">Employed</option>
                <option value="FREELANCING">Freelancing</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="enroll-job-type">Target job type</label>
              <select
                id="enroll-job-type"
                className={styles.select}
                value={form.jobType}
                onChange={(event) => update("jobType", event.target.value as JobType)}
              >
                <option value="NOT_LOOKING">Not Looking</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="FULL_TIME">Full-Time</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="enroll-workplace-pref">Workplace preference</label>
              <select
                id="enroll-workplace-pref"
                className={styles.select}
                value={form.workplacePreference}
                onChange={(event) => update("workplacePreference", event.target.value as WorkplacePreference)}
              >
                <option value="NO_PREFERENCE">No Preference</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
              </select>
            </div>
            <TextField
              label="Current employer (optional)"
              value={form.currentEmployer}
              onChange={(event) => update("currentEmployer", event.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <TextField
              label="Current position (optional)"
              value={form.currentPosition}
              onChange={(event) => update("currentPosition", event.target.value)}
            />
            <TextField
              label="Portfolio URL (optional)"
              type="url"
              placeholder="https://…"
              value={form.portfolioUrl}
              onChange={(event) => update("portfolioUrl", event.target.value)}
              error={errors.portfolioUrl}
            />
          </div>

          <div className={styles.fieldRow}>
            <TextField
              label="LinkedIn URL (optional)"
              type="url"
              placeholder="https://…"
              value={form.linkedinUrl}
              onChange={(event) => update("linkedinUrl", event.target.value)}
              error={errors.linkedinUrl}
            />
            <TextField
              label="Avatar URL (optional)"
              type="url"
              placeholder="https://…"
              value={form.avatarUrl}
              onChange={(event) => update("avatarUrl", event.target.value)}
              error={errors.avatarUrl}
            />
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Enroll student
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
