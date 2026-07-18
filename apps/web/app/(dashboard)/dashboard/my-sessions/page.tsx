"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError, MyBatch, SessionSummary, getMyBatches, listSessions } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: SessionSummary["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "STARTED") return "success";
  if (status === "SCHEDULED") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

function MySessionsContent() {
  const searchParams = useSearchParams();
  const batchFromQuery = searchParams.get("batch");

  const [batches, setBatches] = useState<MyBatch[] | null>(null);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBatches()
      .then((result) => {
        if (cancelled) return;
        setBatches(result);
        const preselect = batchFromQuery && result.some((b) => b.batchId === batchFromQuery) ? batchFromQuery : result[0]?.batchId ?? null;
        setSelectedBatchId(preselect);
      })
      .catch((error) => {
        if (!cancelled) setBatchesError(error instanceof ApiError ? error.message : "Could not load your batches.");
      });
    return () => {
      cancelled = true;
    };
    // Only run once on mount — batchFromQuery is only used for the initial preselection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;
    let cancelled = false;
    setSessions(null);
    setSessionsError(null);
    listSessions(selectedBatchId)
      .then((result) => {
        if (!cancelled) setSessions(result);
      })
      .catch((error) => {
        if (!cancelled) setSessionsError(error instanceof ApiError ? error.message : "Could not load sessions.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBatchId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My sessions</h1>
          <p className={styles.subtitle}>Upcoming and past sessions for your batches.</p>
        </div>

        {batches && batches.length > 0 ? (
          <select
            className={styles.select}
            value={selectedBatchId ?? ""}
            onChange={(event) => setSelectedBatchId(event.target.value)}
          >
            {batches.map((batch) => (
              <option key={batch.batchId} value={batch.batchId}>
                {batch.batchName}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {batchesError ? (
        <div className={styles.banner} role="alert">
          {batchesError}
        </div>
      ) : null}

      {!batchesError && batches && batches.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>You&apos;re not enrolled in any batch yet.</p>
        </div>
      ) : null}

      {selectedBatchId ? (
        <div className={styles.card}>
          {sessionsError ? (
            <div className={styles.banner} role="alert">
              {sessionsError}
            </div>
          ) : sessions === null ? (
            <p className={styles.emptyState}>Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className={styles.emptyState}>No sessions scheduled for this batch yet.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>When</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td className={styles.primaryCell}>{session.title}</td>
                      <td>{formatDateTime(session.scheduledStart)}</td>
                      <td>
                        <span className={styles.badge} data-tone={statusTone(session.status)}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        {session.status === "STARTED" ? (
                          <Link className={styles.textButton} href={`/dashboard/checkin?session=${session.id}`}>
                            Check in
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function MySessionsPage() {
  const isAuthorized = useRequireRole("STUDENT");

  if (!isAuthorized) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <MySessionsContent />
    </Suspense>
  );
}
