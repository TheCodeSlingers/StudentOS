"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
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
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

export default function StudentsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [students, setStudents] = useState<BatchStudent[] | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
        if (!cancelled) setBatchesError(error instanceof ApiError ? error.message : "Could not load workspace data.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  useEffect(() => {
    if (!selectedBatchId) return;
    let cancelled = false;
    setStudentsError(null);
    listBatchStudents(selectedBatchId)
      .then((result) => {
        if (!cancelled) setStudents(result);
      })
      .catch((error) => {
        if (!cancelled) setStudentsError(error instanceof ApiError ? error.message : "Could not load students.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBatchId]);

  const availableMembers = (members ?? []).filter(
    (member) => member.role === "STUDENT" && !students?.some((student) => student.membershipId === member.id)
  );

  async function handleEnroll() {
    if (!selectedBatchId || !selectedMembershipId) {
      setEnrollError("Choose a student to enroll.");
      return;
    }
    setEnrollError(null);
    setIsEnrolling(true);
    try {
      const enrolled = await enrollStudent(selectedBatchId, selectedMembershipId);
      setStudents((current) => (current ? [...current, enrolled] : [enrolled]));
      setSelectedMembershipId("");
    } catch (error) {
      setEnrollError(error instanceof ApiError ? error.message : "Could not enroll this student.");
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleRemove(batchMembershipId: string) {
    if (!selectedBatchId) return;
    setRemovingId(batchMembershipId);
    try {
      await removeStudent(selectedBatchId, batchMembershipId);
      setStudents((current) => current?.filter((student) => student.batchMembershipId !== batchMembershipId) ?? current);
    } catch (error) {
      setStudentsError(error instanceof ApiError ? error.message : "Could not remove this student.");
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

        {batches && batches.length > 0 ? (
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
      </div>

      {batchesError ? (
        <div className={styles.banner} role="alert">
          {batchesError}
        </div>
      ) : null}

      {selectedBatchId ? (
        <div className={styles.card}>
          <p className={styles.sectionTitle}>Enroll a student</p>

          {enrollError ? (
            <div className={styles.banner} role="alert">
              {enrollError}
            </div>
          ) : null}

          <div className={styles.inlineForm}>
            <select
              className={styles.select}
              value={selectedMembershipId}
              onChange={(event) => setSelectedMembershipId(event.target.value)}
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

          {studentsError ? (
            <div className={styles.banner} role="alert">
              {studentsError}
            </div>
          ) : null}

          {students === null && !studentsError ? (
            <p className={styles.emptyState}>Loading roster…</p>
          ) : students && students.length === 0 ? (
            <p className={styles.emptyState}>No students enrolled in this batch yet.</p>
          ) : students ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
