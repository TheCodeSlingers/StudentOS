"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, Member, StudentProfile, getStudentProfile, listMembers } from "@/lib/api-client";
import { avatarColor, initials } from "@/lib/avatar";
import { useRequireRole } from "@/lib/use-require-role";
import sharedStyles from "../../../shared.module.css";
import styles from "./details.module.css";

const HIRE_STATUS_LABELS: Record<StudentProfile["hireStatus"], string> = {
  STUDENT_ONLY: "Student Only",
  JOB_SEEKING: "Actively Looking",
  EMPLOYED: "Employed",
  FREELANCING: "Freelancing",
};

const JOB_TYPE_LABELS: Record<StudentProfile["jobType"], string> = {
  NOT_LOOKING: "Not Looking",
  INTERNSHIP: "Internship",
  PART_TIME: "Part-Time",
  FULL_TIME: "Full-Time",
  FREELANCE: "Freelance",
};

const WORKPLACE_PREFERENCE_LABELS: Record<StudentProfile["workplacePreference"], string> = {
  NO_PREFERENCE: "No Preference",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-Site",
};

const MEMBER_STATUS_TONE: Record<Member["status"], "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  INVITED: "warning",
  INACTIVE: "neutral",
};

export default function StudentDetailsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const params = useParams<{ membershipId: string }>();
  const membershipId = params.membershipId;

  const [member, setMember] = useState<Member | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized || !membershipId) return;
    let cancelled = false;
    setError(null);
    setMember(null);
    setProfile(null);

    Promise.all([listMembers(), getStudentProfile(membershipId)])
      .then(([members, profileResult]) => {
        if (cancelled) return;
        const found = members.find((candidate) => candidate.id === membershipId) ?? null;
        if (!found) {
          setError("This student could not be found in your workspace.");
          return;
        }
        setMember(found);
        setProfile(profileResult);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof ApiError ? fetchError.message : "Could not load this student.");
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthorized, membershipId]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={sharedStyles.page}>
      <div>
        <Link href="/dashboard/students" className={styles.backLink}>
          ← Back to students
        </Link>
        <h1 className={sharedStyles.title}>{member?.user.name ?? "Student details"}</h1>
        <p className={sharedStyles.subtitle}>Full profile for this student.</p>
      </div>

      {error ? (
        <div className={sharedStyles.banner} role="alert">
          {error}
        </div>
      ) : null}

      {!error && (!member || !profile) ? <p className={sharedStyles.emptyState}>Loading…</p> : null}

      {member && profile ? (
        <>
          <div className={sharedStyles.card}>
            <div className={styles.identity}>
              <div
                className={styles.avatar}
                style={profile.avatarUrl ? undefined : { background: avatarColor(member.id).bg, color: avatarColor(member.id).fg }}
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className={styles.avatarImage} />
                ) : (
                  <span>{initials(member.user.name)}</span>
                )}
              </div>
              <div>
                <p className={styles.name}>{member.user.name}</p>
                <p className={styles.email}>{member.user.email}</p>
                <span className={sharedStyles.badge} data-tone={MEMBER_STATUS_TONE[member.status]}>
                  {member.status}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={sharedStyles.card}>
              <p className={sharedStyles.sectionTitle}>Contact</p>
              <dl className={styles.fieldList}>
                <div className={styles.field}>
                  <dt>Phone</dt>
                  <dd>{profile.phone ?? "—"}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Address</dt>
                  <dd>{profile.address ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div className={sharedStyles.card}>
              <p className={sharedStyles.sectionTitle}>Course</p>
              <dl className={styles.fieldList}>
                <div className={styles.field}>
                  <dt>Course name</dt>
                  <dd>{profile.courseName ?? "—"}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Specialization</dt>
                  <dd>{profile.specialization ?? "—"}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Skills</dt>
                  <dd>
                    {profile.skills.length > 0 ? (
                      <div className={styles.tagList}>
                        {profile.skills.map((skill) => (
                          <span key={skill} className={styles.tag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={sharedStyles.card}>
              <p className={sharedStyles.sectionTitle}>Career</p>
              <dl className={styles.fieldList}>
                <div className={styles.field}>
                  <dt>Hire status</dt>
                  <dd>{HIRE_STATUS_LABELS[profile.hireStatus]}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Target job type</dt>
                  <dd>{JOB_TYPE_LABELS[profile.jobType]}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Workplace preference</dt>
                  <dd>{WORKPLACE_PREFERENCE_LABELS[profile.workplacePreference]}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Current employer</dt>
                  <dd>{profile.currentEmployer ?? "—"}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Current position</dt>
                  <dd>{profile.currentPosition ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div className={sharedStyles.card}>
              <p className={sharedStyles.sectionTitle}>Links</p>
              <dl className={styles.fieldList}>
                <div className={styles.field}>
                  <dt>Portfolio</dt>
                  <dd>
                    {profile.portfolioUrl ? (
                      <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                        {profile.portfolioUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className={styles.field}>
                  <dt>LinkedIn</dt>
                  <dd>
                    {profile.linkedinUrl ? (
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                        {profile.linkedinUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
