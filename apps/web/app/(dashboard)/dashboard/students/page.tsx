"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImportModal } from "@/components/modals/import-modal";
import {
  ApiError,
  Batch,
  BatchStudent,
  Member,
  enrollStudent,
  listBatchStudents,
  listBatches,
  listMembers,
  removeStudent,
} from "@/lib/api-client";
import { notify } from "@/lib/toast";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

export default function StudentsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [students, setStudents] = useState<BatchStudent[] | null>(null);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    Promise.all([listBatches(), listMembers()])
      .then(([batchResult, memberResult]) => {
        if (cancelled) return;
        setBatches(batchResult);
        setMembers(memberResult);
        if (batchResult.length > 0) setSelectedBatchId(batchResult[0].id);
      })
      .catch((error) => {
        if (!cancelled) notify.error(error, "Could not load workspace data.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  const refetchStudents = useCallback(() => {
    if (!selectedBatchId) {
      setStudents([]); // Clear students when no batch is selected
      return;
    }
    setStudents(null); // Set to null to show loading state
    listBatchStudents(selectedBatchId)
      .then(setStudents)
      .catch((error) => {
        notify.error(error, "Could not load students for this batch.");
        setStudents([]); // Set to empty array on error to stop loading
      });
  }, [selectedBatchId]);

  useEffect(() => {
    refetchStudents();
  }, [refetchStudents]);

  const availableMembers = (members ?? []).filter(
    (member) => member.role === "STUDENT" && !students?.some((student) => student.membershipId === member.id)
  );

  async function handleEnroll() {
    if (!selectedBatchId) {
      notify.error("A batch must be selected.");
      return;
    }
    if (!selectedMembershipId) {
      notify.error("Choose a student to enroll.");
      return;
    }
    setIsEnrolling(true);
    try {
      const enrolled = await enrollStudent(selectedBatchId, selectedMembershipId);
      setStudents((current) => (current ? [...current, enrolled] : [enrolled]));
      setSelectedMembershipId("");
      notify.success("Student enrolled successfully.");
    } catch (error) {
      notify.error(error, "Could not enroll this student.");
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleRemove(batchMembershipId: string) {
    if (!selectedBatchId) return;
    setRemovingId(batchMembershipId);
    try {
      await removeStudent(selectedBatchId, batchMembershipId);
      setStudents((current) => current?.filter((student) => student.batchMembershipId !== batchMembershipId) ?? null);
      notify.success("Student removed from batch.");
    } catch (error) {
      notify.error(error, "Could not remove this student.");
    } finally {
      setRemovingId(null);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Students</h1>
          <p className={styles.subtitle}>Roster for the selected batch.</p>
        </div>

        <div className={styles.selectGroup}>
          {batches === null ? (
            <p>Loading batches...</p>
          ) : batches.length > 0 ? (
            <select
              className={styles.select}
              value={selectedBatchId ?? ""}
              onChange={(event) => setSelectedBatchId(event.target.value)}
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          ) : null}

          {selectedBatchId ? (
            <Button type="button" variant="secondary" style={{ width: "auto" }} onClick={() => setIsImportOpen(true)}>
              Import CSV
            </Button>
          ) : null}
        </div>
      </div>

      {batches && batches.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>No batches created yet. Create a batch to enroll students.</p>
        </div>
      ) : selectedBatchId ? (
        <div className={styles.card}>
          <p className={styles.sectionTitle}>Enroll a student</p>

          <div className={styles.inlineForm}>
            <select
              className={styles.select}
              value={selectedMembershipId}
              onChange={(event) => setSelectedMembershipId(event.target.value)}
              disabled={availableMembers.length === 0}
            >
              <option value="">
                {availableMembers.length === 0 ? "No available students" : "Select a student"}
              </option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user.name} ({member.user.email})
                </option>
              ))}
            </select>
            <Button type="button" isLoading={isEnrolling} onClick={handleEnroll} style={{ width: "auto" }}>
              Enroll
            </Button>
          </div>

          {students === null ? (
            <p className={styles.emptyState}>Loading roster…</p>
          ) : students.length === 0 ? (
            <p className={styles.emptyState}>No students enrolled in this batch yet.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Role</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.batchMembershipId}>
                      <td>
                        <div className={styles.primaryCell}>{student.name}</div>
                        <div className={styles.secondaryCell}>{student.email}</div>
                      </td>
                      <td>
                        {student.isCR ? (
                          <span className={styles.badge} data-tone="success">
                            CR
                          </span>
                        ) : (
                          <span className={styles.badge} data-tone="neutral">
                            Student
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.textButton}
                            data-tone="danger"
                            disabled={removingId === student.batchMembershipId}
                            onClick={() => handleRemove(student.batchMembershipId)}
                          >
                            {removingId === student.batchMembershipId ? "Removing…" : "Remove"}
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
      ) : null}

      {selectedBatchId ? (
        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          batchId={selectedBatchId}
          onImported={refetchStudents}
        />
      ) : null}
    </div>
  );
}
