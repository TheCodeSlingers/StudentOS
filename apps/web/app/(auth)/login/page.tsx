"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
<<<<<<< HEAD
import { notify } from "@/lib/toast";
import { ApiError, login } from "@/lib/api-client";
=======
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
>>>>>>> main
import { isValidEmail } from "@/lib/validation";
import styles from "../auth.module.css";

interface FormErrors {
  email?: string;
  password?: string;
}

function SessionExpiredBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "session-expired") {
    return null;
  }
  return (
    <div className={styles.infoBanner} role="status">
      Your session expired. Please log in again.
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
<<<<<<< HEAD
      notify.success("Login successful!");
      router.push("/");
=======
      router.push("/dashboard");
>>>>>>> main
    } catch (error) {
      notify.error(error, "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1>Welcome back</h1>
        <p>Log in to your StudentOS workspace.</p>
      </div>

<<<<<<< HEAD
=======
      <Suspense fallback={null}>
        <SessionExpiredBanner />
      </Suspense>

      {apiError ? (
        <div className={styles.banner} role="alert">
          {apiError}
        </div>
      ) : null}

>>>>>>> main
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />

        <div>
          <TextField
            label="Password"
            type="password"
            revealable
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <div className={styles.forgotPasswordRow}>
            <Link href="/forgot-password" className={styles.inlineLink}>
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" isLoading={isSubmitting}>
          Log in
        </Button>

        <div className={styles.divider}>or</div>

        <GoogleAuthButton />
      </form>

      <p className={styles.footer}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={styles.inlineLink}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
