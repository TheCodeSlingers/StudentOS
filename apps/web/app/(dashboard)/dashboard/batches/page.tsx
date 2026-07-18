"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BatchFormModal } from "@/components/modals/batch-form-modal";
import { Button } from "@/components/ui/Button";
import { ApiError, Batch, BatchStatusFilter, archiveBatch, listBatches } from "@/lib/api-client";
import { notify } from "@/lib/toast";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BatchesPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [statusFilter, setStatusFilter] = useState<BatchStatusFilter>("active");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const refetchBatches = useCallback(() => {
    if (!isAuthorized) return;
    setBatches(null);
    setError(null);
    listBatches(statusFilter)
      .then(setBatches)
      .catch((fetchError) => {
        setError(fetchError instanceof ApiError ? fetchError.message : "Could not load batches.");
      });
  }, [isAuthorized, statusFilter]);

  useEffect(() => {
    refetchBatches();
  }, [refetchBatches]);

  async function handleArchiveToggle(batch: Batch) {
    setActionError(null);
    setArchivingId(batch.id);
    try {
      await archiveBatch(batch.id);
      setBatches((current) => current?.filter((item) => item.id !== batch.id) ?? current);
    } catch (archiveError) {
      setActionError(
        archiveError instanceof ApiError
          ? archiveError.message
          : `Could not ${batch.isArchived ? "unarchive" : "archive"} this batch.`
      );
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
          <p className={styles.subtitle}>
            {statusFilter === "active"
              ? "Active batches in your workspace."
              : statusFilter === "archived"
                ? "Archived batches in your workspace."
                : "All batches in your workspace."}
          </p>
        </div>
        <div className={styles.selectGroup}>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BatchStatusFilter)}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
          <Button type="button" style={{ width: "auto" }} onClick={openCreateForm}>
            New batch
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        {batches === null ? (
          <p className={styles.emptyState}>Loading batches…</p>
        ) : batches && batches.length === 0 ? (
          <p className={styles.emptyState}>
            {statusFilter === "archived" ? "No archived batches." : "No active batches yet."}
          </p>
        ) : batches ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className={styles.primaryCell}>
                      <Link href={`/dashboard/batches/${batch.id}`}>{batch.name}</Link>
                    </td>
                    <td>{formatDate(batch.startDate)}</td>
                    <td>{formatDate(batch.endDate)}</td>
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
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.textButton} onClick={() => openEditForm(batch)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          data-tone="warning"
                          disabled={archivingId === batch.id}
                          onClick={() => handleArchiveToggle(batch)}
                        >
                          {archivingId === batch.id
                            ? batch.isArchived
                              ? "Unarchiving…"
                              : "Archiving…"
                            : batch.isArchived
                              ? "Unarchive"
                              : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
