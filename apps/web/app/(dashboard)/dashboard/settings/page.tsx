"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, Workspace, getWorkspace, updateWorkspaceSettings } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

export default function SettingsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("");
  const [attendanceDuration, setAttendanceDuration] = useState("15");
  const [lateThreshold, setLateThreshold] = useState("10");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    getWorkspace()
      .then((result) => {
        setWorkspace(result);
        setTimezone(result.timezone);
        setAttendanceDuration(String(result.settings.defaultAttendanceDurationMins));
        setLateThreshold(String(result.settings.lateThresholdMins));
      })
      .catch((fetchError) => setError(fetchError instanceof ApiError ? fetchError.message : "Could not load workspace settings."));
  }, [isAuthorized]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSavedMessage(null);

    const duration = Number(attendanceDuration);
    const threshold = Number(lateThreshold);
    if (!Number.isInteger(duration) || duration <= 0) {
      setSaveError("Attendance duration must be a positive number of minutes.");
      return;
    }
    if (!Number.isInteger(threshold) || threshold < 0) {
      setSaveError("Late threshold must be zero or a positive number of minutes.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateWorkspaceSettings({
        timezone: timezone.trim() || undefined,
        defaultAttendanceDurationMins: duration,
        lateThresholdMins: threshold,
      });
      setWorkspace(result);
      setSavedMessage("Settings saved.");
    } catch (submitError) {
      setSaveError(submitError instanceof ApiError ? submitError.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Workspace name, timezone, and attendance defaults.</p>
        </div>
      </div>

      {error ? (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      ) : null}

      {workspace ? (
        <div className={styles.card}>
          <p className={styles.sectionTitle}>{workspace.name}</p>

          {saveError ? (
            <div className={styles.banner} role="alert">
              {saveError}
            </div>
          ) : null}
          {savedMessage ? (
            <div className={styles.successBanner} role="status">
              {savedMessage}
            </div>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            <TextField
              label="Timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="e.g. Asia/Dhaka"
            />
            <TextField
              label="Default attendance duration (minutes)"
              type="number"
              min={1}
              value={attendanceDuration}
              onChange={(event) => setAttendanceDuration(event.target.value)}
            />
            <TextField
              label="Late threshold (minutes)"
              type="number"
              min={0}
              value={lateThreshold}
              onChange={(event) => setLateThreshold(event.target.value)}
            />

            <div className={styles.formActions}>
              <Button type="submit" isLoading={isSaving}>
                Save changes
              </Button>
            </div>
          </form>
        </div>
      ) : !error ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>Loading settings…</p>
        </div>
      ) : null}
    </div>
  );
}
