"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import styles from "./error.module.css";

/**
 * Root error boundary (Next.js App Router convention) — catches unhandled render
 * errors anywhere below the root layout, including inside (auth) and (dashboard).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Logo variant="mark" size={32} />
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. You can try again, or head back to the dashboard.</p>
        <div className={styles.actions}>
          <Button type="button" onClick={reset} style={{ width: "auto" }}>
            Try again
          </Button>
          <Link href="/dashboard" className={styles.link}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
