"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, resetPassword } from "@/lib/api-client";
import { getPasswordError } from "@/lib/validation";
import styles from "../auth.module.css";

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);

    const nextErrors: FormErrors = {};
    const passwordError = getPasswordError(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setIsDone(true);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Password reset</h1>
          <p>Your password has been updated. You can now log in with your new password.</p>
        </div>
        <Button type="button" onClick={() => router.push("/login")}>
          Go to log in
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1>Set a new password</h1>
        <p>Choose a new password for your account.</p>
      </div>

      {apiError ? (
        <div className={styles.banner} role="alert">
          {apiError}
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="New password"
          type="password"
          revealable
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirm new password"
          type="password"
          revealable
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
        />

        <Button type="submit" isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Invalid reset link</h1>
          <p>This password reset link is invalid or has expired.</p>
        </div>
        <p className={styles.footer}>
          <Link href="/forgot-password" className={styles.inlineLink}>
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
