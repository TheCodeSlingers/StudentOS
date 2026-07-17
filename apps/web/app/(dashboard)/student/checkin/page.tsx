"use client";

import { useSearchParams } from "next/navigation";
import { ChangeEvent, ClipboardEvent, KeyboardEvent, Suspense, useRef, useState } from "react";
import { ApiError, AttendanceStatus, submitAttendance } from "@/lib/api-client";
import styles from "./checkin.module.css";

const CODE_LENGTH = 6;

function SuccessIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StudentCheckInCard({ sessionId }: { sessionId: string }) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttendanceStatus | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  }

  function submitCode(code: string) {
    setIsSubmitting(true);
    setError(null);

    submitAttendance(sessionId, code)
      .then((record) => {
        setResult(record.status);
      })
      .catch((submitError) => {
        setError(
          submitError instanceof ApiError
            ? submitError.message
            : "Something went wrong. Please try again."
        );
        setDigits(Array(CODE_LENGTH).fill(""));
        focusInput(0);
      })
      .finally(() => setIsSubmitting(false));
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "");
    if (!value) {
      setDigits((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = value[value.length - 1];
    setDigits(nextDigits);

    if (index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    } else if (nextDigits.every((digit) => digit !== "")) {
      submitCode(nextDigits.join(""));
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();

    const nextDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);

    if (pasted.length === CODE_LENGTH) {
      submitCode(pasted);
    } else {
      focusInput(pasted.length);
    }
  }

  if (result) {
    return (
      <div className={styles.card}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}>
            <SuccessIcon />
          </span>
          <p className={styles.successStatus}>You&apos;re marked {result.toLowerCase()}</p>
          <p className={styles.successMessage}>
            Your attendance has been recorded for this session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Session check-in</h1>
      <p className={styles.subtitle}>
        Enter the 6-digit code your mentor shared to mark your attendance.
      </p>

      {error ? (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.digits}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            className={styles.digitInput}
            data-invalid={Boolean(error)}
            value={digit}
            disabled={isSubmitting}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      <p className={styles.subtitle}>
        {isSubmitting ? "Verifying…" : "The code auto-submits once all 6 digits are entered."}
      </p>
    </div>
  );
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  if (!sessionId) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Session check-in</h1>
        <p className={styles.subtitle}>
          No active session was selected. Ask your mentor or class representative for the check-in
          link.
        </p>
      </div>
    );
  }

  return <StudentCheckInCard sessionId={sessionId} />;
}

export default function StudentCheckInPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <CheckInContent />
      </Suspense>
    </div>
  );
}
