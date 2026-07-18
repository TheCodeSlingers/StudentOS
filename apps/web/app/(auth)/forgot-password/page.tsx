"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, forgotPassword } from "@/lib/api-client";
import { isValidEmail } from "@/lib/validation";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setIsSent(true);
    } catch (submitError) {
      setApiError(submitError instanceof ApiError ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Check your email</h1>
          <p>If an account exists for {email.trim()}, we&apos;ve sent a password reset link.</p>
        </div>
        <p className={styles.footer}>
          <Link href="/login" className={styles.inlineLink}>
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1>Reset your password</h1>
        <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
      </div>

      {apiError ? (
        <div className={styles.banner} role="alert">
          {apiError}
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error ?? undefined}
        />

        <Button type="submit" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <p className={styles.footer}>
        Remembered your password?{" "}
        <Link href="/login" className={styles.inlineLink}>
          Log in
        </Link>
      </p>
    </div>
  );
}
