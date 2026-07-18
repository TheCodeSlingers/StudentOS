"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EnrollStudentModal } from "@/components/modals/enroll-student-modal";
import { ImportModal } from "@/components/modals/import-modal";
import {
  ApiError,
  Batch,
  BatchStudent,
  StudentProfile,
  getStudentAttendanceHistory,
  getStudentProfile,
  listBatchStudents,
  listBatches,
  removeStudent,
  setBatchMemberCR,
} from "@/lib/api-client";
import { avatarColor, initials } from "@/lib/avatar";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

const HIRE_STATUS_LABELS: Record<StudentProfile["hireStatus"], string> = {
  STUDENT_ONLY: "Student Only",
  JOB_SEEKING: "Actively Looking",
  EMPLOYED: "Employed",
  FREELANCING: "Freelancing",
};

const HIRE_STATUS_TONE: Record<StudentProfile["hireStatus"], "neutral" | "warning" | "success"> = {
  STUDENT_ONLY: "neutral",
  JOB_SEEKING: "warning",
  EMPLOYED: "success",
  FREELANCING: "neutral",
};

type SortField = "name" | "email" | "courseName" | "specialization" | "hireStatus" | "jobType" | "workplacePreference" | "attendance" | "isCR";

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "isCR", label: "Role" },
  { value: "courseName", label: "Course" },
  { value: "specialization", label: "Specialization" },
  { value: "hireStatus", label: "Hire status" },
  { value: "jobType", label: "Job type" },
  { value: "workplacePreference", label: "Workplace preference" },
  { value: "attendance", label: "Attendance %" },
];

/** Undefined/null values always sort to the end, regardless of direction. */
function compareNullable<T>(a: T | null | undefined, b: T | null | undefined, compare: (a: T, b: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return compare(a, b);
}

export default function StudentsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [students, setStudents] = useState<BatchStudent[] | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, StudentProfile>>({});
  const [attendanceRates, setAttendanceRates] = useState<Record<string, number | null>>({});

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingCRId, setUpdatingCRId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    listBatches()
      .then((batchResult) => {
        if (cancelled) return;
        setBatches(batchResult);
        if (batchResult.length > 0) setSelectedBatchId(batchResult[0].id);
      })
      .catch((error) => {
        if (!cancelled) setBatchesError(error instanceof ApiError ? error.message : "Could not load workspace data.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  const refetchStudents = useCallback(() => {
    if (!selectedBatchId) return;
    setStudentsError(null);
    listBatchStudents(selectedBatchId)
      .then(setStudents)
      .catch((error) => {
        setStudentsError(error instanceof ApiError ? error.message : "Could not load students.");
      });
  }, [selectedBatchId]);

  useEffect(() => {
    refetchStudents();
  }, [refetchStudents]);

  // A couple of profile tidbits (course, hire status) are shown per row in
  // the roster table — there's no bulk "list profiles" endpoint, so fetch
  // each newly-seen student's profile individually and cache it by
  // membershipId. `attempted` (a ref, not state) tracks which membershipIds
  // we've already tried, success or failure, so a permanently-failing fetch
  // doesn't retry on every render.
  const attemptedProfileFetches = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!students) return;
    const missing = students.filter((student) => !attemptedProfileFetches.current.has(student.membershipId));
    if (missing.length === 0) return;
    missing.forEach((student) => attemptedProfileFetches.current.add(student.membershipId));

    let cancelled = false;
    Promise.all(
      missing.map((student) =>
        getStudentProfile(student.membershipId)
          .then((profile) => [student.membershipId, profile] as const)
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const fetched = results.filter((result): result is readonly [string, StudentProfile] => result !== null);
      if (fetched.length === 0) return;
      setProfiles((current) => {
        const next = { ...current };
        for (const [membershipId, profile] of fetched) {
          next[membershipId] = profile;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [students]);

  // Same pattern for attendance % — computed from each student's history
  // for this batch since there's no bulk endpoint for it either.
  const attemptedAttendanceFetches = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!students) return;
    const missing = students.filter((student) => !attemptedAttendanceFetches.current.has(student.batchMembershipId));
    if (missing.length === 0) return;
    missing.forEach((student) => attemptedAttendanceFetches.current.add(student.batchMembershipId));

    let cancelled = false;
    Promise.all(
      missing.map((student) =>
        getStudentAttendanceHistory(student.batchMembershipId)
          .then((history) => {
            const countable = history.filter((record) => record.status !== "EXCUSED");
            const rate =
              countable.length === 0
                ? null
                : Math.round((countable.filter((record) => record.status === "PRESENT" || record.status === "LATE").length / countable.length) * 100);
            return [student.batchMembershipId, rate] as const;
          })
          .catch(() => [student.batchMembershipId, null] as const)
      )
    ).then((results) => {
      if (cancelled) return;
      setAttendanceRates((current) => {
        const next = { ...current };
        for (const [batchMembershipId, rate] of results) {
          next[batchMembershipId] = rate;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [students]);

  function handleEnrolled(enrolled: BatchStudent) {
    setStudents((current) => (current ? [...current, enrolled] : [enrolled]));
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

  async function handleToggleCR(student: BatchStudent) {
    if (!selectedBatchId) return;
    setUpdatingCRId(student.batchMembershipId);
    setStudentsError(null);
    try {
      await setBatchMemberCR(selectedBatchId, student.batchMembershipId, !student.isCR);
      setStudents(
        (current) =>
          current?.map((item) =>
            item.batchMembershipId === student.batchMembershipId ? { ...item, isCR: !item.isCR } : item
          ) ?? current
      );
    } catch (error) {
      setStudentsError(error instanceof ApiError ? error.message : "Could not update Class Representative status.");
    } finally {
      setUpdatingCRId(null);
    }
  }

  const displayedStudents = useMemo(() => {
    if (!students) return null;

    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? students.filter(
          (student) => student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query)
        )
      : students;

    const direction = sortDirection === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return direction * a.name.localeCompare(b.name);
        case "email":
          return direction * a.email.localeCompare(b.email);
        case "isCR":
          return direction * (Number(b.isCR) - Number(a.isCR));
        case "attendance":
          return direction * compareNullable(attendanceRates[a.batchMembershipId], attendanceRates[b.batchMembershipId], (x, y) => x - y);
        default: {
          const profileA = profiles[a.membershipId];
          const profileB = profiles[b.membershipId];
          return direction * compareNullable(profileA?.[sortField], profileB?.[sortField], (x, y) => String(x).localeCompare(String(y)));
        }
      }
    });

    return sorted;
  }, [students, searchQuery, sortField, sortDirection, profiles, attendanceRates]);

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

          {selectedBatchId ? (
            <Button type="button" variant="secondary" style={{ width: "auto" }} onClick={() => setIsImportOpen(true)}>
              Import CSV
            </Button>
          ) : null}
        </div>
      </div>

      {batchesError ? (
        <div className={styles.banner} role="alert">
          {batchesError}
        </div>
      ) : null}

      {selectedBatchId ? (
        <div className={styles.card}>
          <div className={styles.header} style={{ marginBottom: "var(--space-4)" }}>
            <p className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Roster
            </p>
            <Button type="button" style={{ width: "auto" }} onClick={() => setIsEnrollOpen(true)}>
              Enroll a new student
            </Button>
          </div>

          <div className={styles.toolbar}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select
              className={styles.select}
              style={{ width: "auto" }}
              value={sortField}
              onChange={(event) => setSortField(event.target.value as SortField)}
              aria-label="Sort by"
            >
              {SORT_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
              aria-label={sortDirection === "asc" ? "Sorting ascending" : "Sorting descending"}
            >
              {sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"}
            </button>
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
          ) : displayedStudents && displayedStudents.length === 0 ? (
            <p className={styles.emptyState}>No students match your search.</p>
          ) : displayedStudents ? (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Role</th>
                    <th>Course</th>
                    <th>Hire status</th>
                    <th>Attendance</th>
                    <th>Phone</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((student) => {
                    const profile = profiles[student.membershipId];
                    const attendanceRate = attendanceRates[student.batchMembershipId];
                    const avatar = avatarColor(student.membershipId);
                    return (
                      <tr key={student.batchMembershipId}>
                        <td>
                          <div className={styles.rowIdentity}>
                            <span className={styles.avatarCircle} style={{ background: avatar.bg, color: avatar.fg }}>
                              {initials(student.name)}
                            </span>
                            <div>
                              <Link href={`/dashboard/students/${student.membershipId}`} className={styles.primaryCell}>
                                {student.name}
                              </Link>
                              <div className={styles.secondaryCell}>{student.email}</div>
                            </div>
                          </div>
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
                          <div className={styles.primaryCell}>{profile?.courseName ?? "—"}</div>
                          <div className={styles.secondaryCell}>{profile?.specialization ?? ""}</div>
                        </td>
                        <td>
                          {profile ? (
                            <span className={styles.badge} data-tone={HIRE_STATUS_TONE[profile.hireStatus]}>
                              {HIRE_STATUS_LABELS[profile.hireStatus]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {attendanceRate === undefined ? (
                            "—"
                          ) : attendanceRate === null ? (
                            <span className={styles.badge} data-tone="neutral">
                              No sessions yet
                            </span>
                          ) : (
                            <span
                              className={styles.badge}
                              data-tone={attendanceRate >= 75 ? "success" : attendanceRate >= 50 ? "warning" : "danger"}
                            >
                              {attendanceRate}%
                            </span>
                          )}
                        </td>
                        <td>{profile?.phone ?? "—"}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.textButton}
                              disabled={updatingCRId === student.batchMembershipId}
                              onClick={() => handleToggleCR(student)}
                            >
                              {updatingCRId === student.batchMembershipId
                                ? "Updating…"
                                : student.isCR
                                  ? "Revoke CR"
                                  : "Make CR"}
                            </button>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
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

      {selectedBatchId ? (
        <EnrollStudentModal
          isOpen={isEnrollOpen}
          onClose={() => setIsEnrollOpen(false)}
          batchId={selectedBatchId}
          onEnrolled={handleEnrolled}
        />
      ) : null}
    </div>
  );
}
