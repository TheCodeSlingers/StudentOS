"use client";

import { useEffect, useMemo, useState } from "react";
import { AttendanceGrid } from "@/components/attendance-grid";
import { Button } from "@/components/ui/Button";
import { ApiError, SessionSummary, closeAttendanceWindow, listSessions, openAttendanceWindow } from "@/lib/api-client";
import styles from "./session-manager.module.css";

const DEFAULT_ATTENDANCE_DURATION_MINS = 15;

export interface SessionManagerBatch {
  id: string;
  name: string;
  attendanceDurationMinsOverride?: number | null;
}

interface SessionGroup {
  dateKey: string;
  dateLabel: string;
  sessions: SessionSummary[];
}

function groupSessionsByDate(sessions: SessionSummary[]): SessionGroup[] {
  const groups = new Map<string, SessionSummary[]>();

  for (const session of sessions) {
    const date = new Date(session.scheduledStart);
    const dateKey = date.toDateString();
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(dateKey, [session]);
    }
  }

  return Array.from(groups.entries())
    .map(([dateKey, groupSessions]) => ({
      dateKey,
      dateLabel: new Date(groupSessions[0].scheduledStart).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      sessions: groupSessions.sort(
        (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
      ),
    }))
    .sort((a, b) => new Date(a.sessions[0].scheduledStart).getTime() - new Date(b.sessions[0].scheduledStart).getTime());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface CalendarViewProps {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

function CalendarView({ sessions, selectedSessionId, onSelect }: CalendarViewProps) {
  const groups = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  if (groups.length === 0) {
    return <p className={styles.emptyState}>No sessions scheduled for this batch yet.</p>;
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.dateKey} className={styles.dateGroup}>
          <p className={styles.dateHeading}>{group.dateLabel}</p>
          <ul className={styles.sessionList}>
            {group.sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className={styles.sessionRow}
                  data-selected={session.id === selectedSessionId}
                  onClick={() => onSelect(session.id)}
                >
                  <span className={styles.sessionTime}>{formatTime(session.scheduledStart)}</span>
                  <span className={styles.sessionMeta}>
                    <span className={styles.sessionTitle}>{session.title}</span>
                  </span>
                  <span className={styles.badge} data-status={session.status}>
                    {session.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface CodeDisplayCardProps {
  session: SessionSummary | null;
  durationMins: number;
  onOpenAttendance: () => void;
  onCloseAttendance: () => void;
  onManageRoster: () => void;
  isActionLoading: boolean;
  actionError: string | null;
}

function CodeDisplayCard({
  session,
  durationMins,
  onOpenAttendance,
  onCloseAttendance,
  onManageRoster,
  isActionLoading,
  actionError,
}: CodeDisplayCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (session?.status !== "STARTED") {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session?.status]);

  if (!session) {
    return (
      <div className={styles.card}>
        <p className={styles.sectionTitle}>Attendance code</p>
        <p className={styles.emptyState}>Select a session to view attendance controls.</p>
      </div>
    );
  }

  const openedAt = session.attendanceOpenedAt ? new Date(session.attendanceOpenedAt).getTime() : null;
  const remainingMs = openedAt ? Math.max(0, openedAt + durationMins * 60_000 - now) : 0;
  const remainingMinutes = Math.floor(remainingMs / 60_000);
  const remainingSeconds = Math.floor((remainingMs % 60_000) / 1000);

  return (
    <div className={styles.card}>
      <div className={styles.codeCard}>
        <div>
          <p className={styles.codeSessionTitle}>{session.title}</p>
          <p className={styles.codeSessionTime}>
            {formatTime(session.scheduledStart)} – {formatTime(session.scheduledEnd)}
          </p>
        </div>

        {actionError ? (
          <div className={styles.banner} role="alert">
            {actionError}
          </div>
        ) : null}

        {session.status === "STARTED" && session.currentCode ? (
          <>
            <div className={styles.codeDisplay}>{session.currentCode}</div>
            <p className={styles.timeLeft}>
              Time left:{" "}
              <strong>
                {String(remainingMinutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
              </strong>
            </p>
          </>
        ) : (
          <p className={styles.emptyState}>
            {session.status === "SCHEDULED"
              ? "Attendance hasn't been opened yet."
              : "The attendance window for this session is closed."}
          </p>
        )}

        <div className={styles.actionRow}>
          {session.status === "SCHEDULED" ? (
            <Button type="button" onClick={onOpenAttendance} isLoading={isActionLoading}>
              Open attendance
            </Button>
          ) : null}

          {session.status === "STARTED" ? (
            <Button type="button" variant="secondary" onClick={onCloseAttendance} isLoading={isActionLoading}>
              Close attendance
            </Button>
          ) : null}

          <Button type="button" variant="secondary" onClick={onManageRoster}>
            Manual marking
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SessionManagerProps {
  title?: string;
  batches: SessionManagerBatch[];
  batchesError?: string | null;
  emptyBatchesMessage?: string;
}

/**
 * Session calendar + attendance-code + manual-marking UI, shared between the
 * mentor Sessions page and the CR-scoped Sessions page. The caller resolves
 * which batches to offer (a mentor's whole workspace vs a CR's own batches) —
 * this component only knows how to manage sessions once a batch is picked.
 */
export function SessionManager({
  title = "Sessions",
  batches,
  batchesError = null,
  emptyBatchesMessage = "No active batches yet.",
}: SessionManagerProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  useEffect(() => {
    setSelectedBatchId((current) => {
      if (current && batches.some((batch) => batch.id === current)) {
        return current;
      }
      return batches[0]?.id ?? null;
    });
  }, [batches]);

  useEffect(() => {
    if (!selectedBatchId) {
      return;
    }

    let cancelled = false;
    setIsLoadingSessions(true);
    setSessionsError(null);

    listSessions(selectedBatchId)
      .then((result) => {
        if (cancelled) return;
        setSessions(result);
        setSelectedSessionId((current) => current ?? result[0]?.id ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        setSessionsError(error instanceof ApiError ? error.message : "Could not load sessions.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBatchId]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const selectedSession = sessions?.find((session) => session.id === selectedSessionId) ?? null;
  const durationMins = selectedBatch?.attendanceDurationMinsOverride ?? DEFAULT_ATTENDANCE_DURATION_MINS;

  function updateSession(updated: SessionSummary) {
    setSessions((current) => current?.map((session) => (session.id === updated.id ? updated : session)) ?? current);
  }

  async function handleOpenAttendance() {
    if (!selectedSessionId) return;
    setActionError(null);
    setIsActionLoading(true);
    try {
      const updated = await openAttendanceWindow(selectedSessionId);
      updateSession(updated);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Could not open attendance.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleCloseAttendance() {
    if (!selectedSessionId) return;
    setActionError(null);
    setIsActionLoading(true);
    try {
      const updated = await closeAttendanceWindow(selectedSessionId);
      updateSession(updated);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Could not close attendance.");
    } finally {
      setIsActionLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>

        {batches.length > 0 ? (
          <select
            className={styles.batchSelect}
            value={selectedBatchId ?? ""}
            onChange={(event) => {
              setSelectedBatchId(event.target.value);
              setSelectedSessionId(null);
            }}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
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

      {!batchesError && batches.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>{emptyBatchesMessage}</p>
        </div>
      ) : null}

      {selectedBatchId ? (
        <div className={styles.layout}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>Calendar</p>
            {sessionsError ? (
              <div className={styles.banner} role="alert">
                {sessionsError}
              </div>
            ) : isLoadingSessions && !sessions ? (
              <p className={styles.emptyState}>Loading sessions…</p>
            ) : (
              <CalendarView
                sessions={sessions ?? []}
                selectedSessionId={selectedSessionId}
                onSelect={setSelectedSessionId}
              />
            )}
          </div>

          <CodeDisplayCard
            session={selectedSession}
            durationMins={durationMins}
            onOpenAttendance={handleOpenAttendance}
            onCloseAttendance={handleCloseAttendance}
            onManageRoster={() => setIsRosterOpen(true)}
            isActionLoading={isActionLoading}
            actionError={actionError}
          />
        </div>
      ) : null}

      {selectedSessionId ? (
        <AttendanceGrid sessionId={selectedSessionId} isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />
      ) : null}
    </div>
  );
}
