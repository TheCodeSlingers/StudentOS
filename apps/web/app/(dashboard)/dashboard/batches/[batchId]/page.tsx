"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, BatchDetails, getBatch } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../../shared.module.css";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BatchDetailPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId;

  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized || !batchId) return;
    let cancelled = false;
    getBatch(batchId)
      .then((result) => {
        if (!cancelled) setBatch(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof ApiError ? fetchError.message : "Could not load this batch.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, batchId]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link href="/dashboard/batches" className={styles.textButton}>
            ← Back to batches
          </Link>
          <h1 className={styles.title}>{batch?.name ?? "Batch details"}</h1>
        </div>
      </div>

      {error ? (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      ) : null}

      {!error && !batch ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>Loading batch…</p>
        </div>
      ) : null}

      {batch ? (
        <>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>Overview</p>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <td className={styles.primaryCell}>Status</td>
                    <td>
                      {batch.isArchived ? (
                        <span className={styles.badge} data-tone="neutral">
                          Archived
                        </span>
                      ) : (
                        <span className={styles.badge} data-tone="success">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>Start date</td>
                    <td>{formatDate(batch.startDate)}</td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>End date</td>
                    <td>{formatDate(batch.endDate)}</td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>Late threshold override</td>
                    <td>{batch.lateThresholdMinsOverride ?? "Uses workspace default"}</td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>Attendance duration override</td>
                    <td>{batch.attendanceDurationMinsOverride ?? "Uses workspace default"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.sectionTitle}>Metrics</p>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <td className={styles.primaryCell}>Enrolled students</td>
                    <td>{batch.metrics.totalStudents}</td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>Class representatives</td>
                    <td>{batch.metrics.totalCRs}</td>
                  </tr>
                  <tr>
                    <td className={styles.primaryCell}>Total sessions</td>
                    <td>{batch.metrics.totalSessions}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.sectionTitle}>Manage</p>
            <div className={styles.rowActions} style={{ justifyContent: "flex-start" }}>
              <Link href="/dashboard/students" className={styles.textButton}>
                View roster
              </Link>
              <Link href="/dashboard/sessions" className={styles.textButton}>
                View sessions
              </Link>
              <Link href="/dashboard/attendance" className={styles.textButton}>
                View attendance history
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
