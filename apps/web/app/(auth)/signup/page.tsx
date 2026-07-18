"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { notify } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { getPasswordError, isValidEmail } from "@/lib/validation";
import styles from "../auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let isValid = true;

    if (!name.trim()) {
      notify.error("Full name is required.");
      isValid = false;
    }

    if (!email.trim()) {
      notify.error("Email is required.");
      isValid = false;
    } else if (!isValidEmail(email)) {
      notify.error("Enter a valid email address.");
      isValid = false;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      notify.error(passwordError);
      isValid = false;
    }

    if (confirmPassword !== password) {
      notify.error("Passwords do not match.");
      isValid = false;
    }

    if (isValid) {
      setStep(2);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceName.trim()) {
      notify.error("Organization name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim(),
      });
      notify.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error) {
      notify.error(error, "Something went wrong. Please try again.");
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

      {step === 1 ? (
        <form className={styles.form} onSubmit={handleContinue} noValidate>
          <GoogleAuthButton />

          <div className={styles.divider}>or continue with email</div>

          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            revealable
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm password"
            type="password"
            revealable
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <Button type="submit">Continue</Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Organization name"
            placeholder="e.g. Horizon Coaching Center"
            autoComplete="organization"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
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
