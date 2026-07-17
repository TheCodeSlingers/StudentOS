"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, InviteMemberResult, MembershipRole, inviteMember } from "@/lib/api-client";
import { isValidEmail } from "@/lib/validation";
import styles from "./invite-modal.module.css";

interface FormErrors {
  name?: string;
  email?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: (result: InviteMemberResult) => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function InviteModal({ isOpen, onClose, onInvited }: InviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("STUDENT");
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setRole("STUDENT");
      setErrors({});
      setApiError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inviteMember({ name: name.trim(), email: email.trim(), role });
      setSuccessMessage(`Invitation sent to ${email.trim()}.`);
      setName("");
      setEmail("");
      setRole("STUDENT");
      onInvited?.(result);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
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
        aria-labelledby="invite-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="invite-modal-title" className={styles.title}>
              Invite a member
            </h2>
            <p className={styles.subtitle}>Add a mentor or student to this workspace.</p>
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

        {successMessage ? (
          <div className={styles.successBanner} role="status">
            {successMessage}
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />

          <div className={styles.roleGroup}>
            <span className={styles.roleLabel}>Role</span>
            <div className={styles.roleOptions} role="radiogroup" aria-label="Member role">
              {(["STUDENT", "MENTOR"] as MembershipRole[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={role === option}
                  className={styles.roleOption}
                  data-selected={role === option}
                  onClick={() => setRole(option)}
                >
                  {option === "STUDENT" ? "Student" : "Mentor"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Send invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
