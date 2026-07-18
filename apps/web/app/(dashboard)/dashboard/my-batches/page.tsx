"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, MyBatch, getMyBatches } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MyBatchesPage() {
  const isAuthorized = useRequireRole("STUDENT");
  const [batches, setBatches] = useState<MyBatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    getMyBatches()
      .then((result) => {
        if (!cancelled) setBatches(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof ApiError ? fetchError.message : "Could not load your batches.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My batches</h1>
          <p className={styles.subtitle}>Batches you&apos;re currently enrolled in.</p>
        </div>
      </div>

      {error ? (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.card}>
        {!error && batches === null ? (
          <p className={styles.emptyState}>Loading your batches…</p>
        ) : batches && batches.length === 0 ? (
          <p className={styles.emptyState}>You&apos;re not enrolled in any batch yet.</p>
        ) : batches ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Role</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.batchMembershipId}>
                    <td className={styles.primaryCell}>
                      {batch.batchName}
                      {batch.isArchived ? (
                        <span className={styles.badge} data-tone="neutral" style={{ marginLeft: "var(--space-2)" }}>
                          Archived
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {batch.isCR ? (
                        <span className={styles.badge} data-tone="success">
                          CR
                        </span>
                      ) : (
                        <span className={styles.badge} data-tone="neutral">
                          Student
                        </span>
                      )}
                    </td>
                    <td>{formatDate(batch.startDate)}</td>
                    <td>{formatDate(batch.endDate)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link className={styles.textButton} href={`/dashboard/my-sessions?batch=${batch.batchId}`}>
                          Sessions
                        </Link>
                        <Link
                          className={styles.textButton}
                          href={`/dashboard/my-attendance?batch=${batch.batchId}`}
                        >
                          Attendance
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
