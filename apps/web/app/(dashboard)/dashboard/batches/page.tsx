"use client";

import { useEffect, useState } from "react";
import { BatchFormModal } from "@/components/modals/batch-form-modal";
import { Button } from "@/components/ui/Button";
import { ApiError, Batch, archiveBatch, listBatches } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BatchesPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    listBatches()
      .then((result) => {
        if (!cancelled) setBatches(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof ApiError ? fetchError.message : "Could not load batches.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  async function handleArchive(batchId: string) {
    setActionError(null);
    setArchivingId(batchId);
    try {
      await archiveBatch(batchId);
      setBatches((current) => current?.filter((batch) => batch.id !== batchId) ?? current);
    } catch (archiveError) {
      setActionError(archiveError instanceof ApiError ? archiveError.message : "Could not archive this batch.");
    } finally {
      setArchivingId(null);
    }
  }

  function openCreateForm() {
    setEditingBatch(null);
    setIsFormOpen(true);
  }

  function openEditForm(batch: Batch) {
    setEditingBatch(batch);
    setIsFormOpen(true);
  }

  function handleSaved(saved: Batch) {
    setBatches((current) => {
      if (!current) return [saved];
      const exists = current.some((batch) => batch.id === saved.id);
      return exists ? current.map((batch) => (batch.id === saved.id ? saved : batch)) : [saved, ...current];
    });
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Batches</h1>
          <p className={styles.subtitle}>Active batches in your workspace.</p>
        </div>
        <Button type="button" style={{ width: "auto" }} onClick={openCreateForm}>
          New batch
        </Button>
      </div>

      {error ? (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      ) : null}
      {actionError ? (
        <div className={styles.banner} role="alert">
          {actionError}
        </div>
      ) : null}

      <div className={styles.card}>
        {!error && batches === null ? (
          <p className={styles.emptyState}>Loading batches…</p>
        ) : batches && batches.length === 0 ? (
          <p className={styles.emptyState}>No active batches yet.</p>
        ) : batches ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Capacity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className={styles.primaryCell}>{batch.name}</td>
                    <td>{formatDate(batch.startDate)}</td>
                    <td>{formatDate(batch.endDate)}</td>
                    <td>{batch.capacity ?? "—"}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.textButton} onClick={() => openEditForm(batch)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          data-tone="danger"
                          disabled={archivingId === batch.id}
                          onClick={() => handleArchive(batch.id)}
                        >
                          {archivingId === batch.id ? "Archiving…" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <BatchFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        batch={editingBatch}
        onSaved={handleSaved}
      />
    </div>
  );
}
