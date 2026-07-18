"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { notify } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { isValidEmail } from "@/lib/validation";
import styles from "../auth.module.css";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      notify.error("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      notify.error("Enter a valid email address.");
      return;
    }
    if (!password) {
      notify.error("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      notify.success("Login successful!");
      router.push("/dashboard");
    } catch (error) {
      notify.error(error, "Invalid email or password. Please try again.");
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

      <Suspense fallback={null}>
        <SessionExpiredBanner />
      </Suspense>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div>
          <TextField
            label="Password"
            type="password"
            revealable
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
