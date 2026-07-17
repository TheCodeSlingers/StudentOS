"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, signup } from "@/lib/api-client";
import { getPasswordError, isValidEmail } from "@/lib/validation";
import styles from "../auth.module.css";

interface AccountErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface OrganizationErrors {
  organizationName?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [organizationErrors, setOrganizationErrors] = useState<OrganizationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateAccountStep(): boolean {
    const nextErrors: AccountErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setAccountErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateOrganizationStep(): boolean {
    const nextErrors: OrganizationErrors = {};

    if (!organizationName.trim()) {
      nextErrors.organizationName = "Organization name is required.";
    }

    setOrganizationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validateAccountStep()) {
      setStep(2);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);

    if (!validateOrganizationStep()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
      });
      router.push("/");
    } catch (error) {
      setApiError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.steps}>
        <span className={styles.step} data-active="true" />
        <span className={styles.step} data-active={step === 2} />
      </div>

      <div className={styles.header}>
        {step === 1 ? (
          <>
            <h1>Create your account</h1>
            <p>Step 1 of 2 — tell us who you are.</p>
          </>
        ) : (
          <>
            <h1>Set up your organization</h1>
            <p>Step 2 of 2 — this becomes your StudentOS workspace.</p>
          </>
        )}
      </div>

      {apiError ? (
        <div className={styles.banner} role="alert">
          {apiError}
        </div>
      ) : null}

      {step === 1 ? (
        <form className={styles.form} onSubmit={handleContinue} noValidate>
          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={accountErrors.name}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={accountErrors.email}
          />
          <TextField
            label="Password"
            type="password"
            revealable
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={accountErrors.password}
          />
          <TextField
            label="Confirm password"
            type="password"
            revealable
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={accountErrors.confirmPassword}
          />

          <Button type="submit">Continue</Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Organization name"
            placeholder="e.g. Horizon Coaching Center"
            autoComplete="organization"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            error={organizationErrors.organizationName}
          />

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create account
            </Button>
          </div>
        </form>
      )}

      <p className={styles.footer}>
        Already have an account?{" "}
        <Link href="/login" className={styles.inlineLink}>
          Log in
        </Link>
      </p>
    </div>
  );
}
