"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Batch,
  Member,
  MyBatch,
  listBatches,
  listMembers,
  getMyBatches,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/toast";
import { avatarColor, initials } from "@/lib/avatar";
import {
  AttendanceIcon,
  BatchesIcon,
  MembersIcon,
  SessionsIcon,
  StudentsIcon,
} from "@/components/dashboard/nav/icons";
import styles from "./dashboard.module.css";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7.5V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15V7.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 15h14l1-8-4.5 3.2L10 5l-3.5 5.2L2 7l1 8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface StatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatProps) {
  const tone = avatarColor(label);
  return (
    <motion.div
      className={styles.statCard}
      variants={itemVariants}
      style={{ "--stat-accent": tone.fg } as React.CSSProperties}
    >
      <span className={styles.statIcon} style={{ background: tone.bg, color: tone.fg }}>
        {icon}
      </span>
      <div>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </motion.div>
  );
}

interface BatchCardProps {
  href: string;
  name: string;
  dateRange: string;
  badge?: React.ReactNode;
}

function BatchCard({ href, name, dateRange, badge }: BatchCardProps) {
  const tone = avatarColor(name);
  return (
    <motion.div variants={itemVariants}>
      <Link href={href} className={styles.batchCard} style={{ "--batch-accent": tone.fg } as React.CSSProperties}>
        <div className={styles.batchCardHeader}>
          <span className={styles.batchCardName}>{name}</span>
          <ArrowIcon className={styles.batchCardArrow} />
        </div>
        <span className={styles.batchCardDates}>{dateRange}</span>
        {badge}
      </Link>
    </motion.div>
  );
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

function MentorDashboard() {
  const { user, workspaceName } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMembers(), listBatches("all")])
      .then(([memberList, batchList]) => {
        if (cancelled) return;
        setMembers(memberList);
        setBatches(batchList);
      })
      .catch((error) => notify.error(error, "Could not load your dashboard."));
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = members === null || batches === null;
  const totalStudents = members?.filter((m) => m.role === "STUDENT").length ?? 0;
  const totalMentors = members?.filter((m) => m.role === "MENTOR").length ?? 0;
  const activeBatches = batches?.filter((b) => !b.isArchived) ?? [];
  const archivedBatches = batches?.filter((b) => b.isArchived) ?? [];
  const recentBatches = [...activeBatches]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 6);

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <span className={styles.welcomeAvatar}>{initials(user?.name)}</span>
        <div className={styles.welcomeBody}>
          <h1 className={styles.welcomeTitle}>Welcome back, {firstName(user?.name)}</h1>
          <p className={styles.welcomeSubtitle}>Here&apos;s what&apos;s happening in {workspaceName ?? "your workspace"}.</p>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className={styles.statsGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonStat} />
            ))}
          </div>
          <div className={styles.batchGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        </>
      ) : (
        <motion.div className={styles.page} variants={containerVariants} initial="hidden" animate="visible">
          <div className={styles.statsGrid}>
            <StatCard label="Total students" value={totalStudents} icon={<StudentsIcon />} />
            <StatCard label="Active batches" value={activeBatches.length} icon={<BatchesIcon />} />
            <StatCard label="Mentors" value={totalMentors} icon={<MembersIcon />} />
            <StatCard label="Archived batches" value={archivedBatches.length} icon={<ArchiveIcon />} />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent batches</h2>
              <Link href="/dashboard/batches" className={styles.sectionLink}>
                View all
              </Link>
            </div>
            {recentBatches.length === 0 ? (
              <p className={styles.emptyState}>No active batches yet. Create one to get started.</p>
            ) : (
              <div className={styles.batchGrid}>
                {recentBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    href={`/dashboard/batches/${batch.id}`}
                    name={batch.name}
                    dateRange={`${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Quick actions</h2>
            </div>
            <div className={styles.quickActions}>
              <Link href="/dashboard/students" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <StudentsIcon />
                </span>
                Manage students
              </Link>
              <Link href="/dashboard/batches" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <BatchesIcon />
                </span>
                Manage batches
              </Link>
              <Link href="/dashboard/sessions" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <SessionsIcon />
                </span>
                Schedule sessions
              </Link>
              <Link href="/dashboard/members" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <MembersIcon />
                </span>
                Invite members
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StudentDashboard() {
  const { user, isCR } = useAuth();
  const [batches, setBatches] = useState<MyBatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBatches()
      .then((result) => {
        if (!cancelled) setBatches(result);
      })
      .catch((error) => notify.error(error, "Could not load your dashboard."));
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = batches === null;
  const activeBatches = batches?.filter((b) => !b.isArchived) ?? [];
  const crBatches = batches?.filter((b) => b.isCR) ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <span className={styles.welcomeAvatar}>{initials(user?.name)}</span>
        <div className={styles.welcomeBody}>
          <h1 className={styles.welcomeTitle}>Welcome back, {firstName(user?.name)}</h1>
          <p className={styles.welcomeSubtitle}>Here&apos;s an overview of your batches and attendance.</p>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className={styles.statsGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonStat} />
            ))}
          </div>
          <div className={styles.batchGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        </>
      ) : (
        <motion.div className={styles.page} variants={containerVariants} initial="hidden" animate="visible">
          <div className={styles.statsGrid}>
            <StatCard label="Enrolled batches" value={batches?.length ?? 0} icon={<BatchesIcon />} />
            <StatCard label="Active batches" value={activeBatches.length} icon={<AttendanceIcon />} />
            {isCR ? <StatCard label="Class rep of" value={crBatches.length} icon={<CrownIcon />} /> : null}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My batches</h2>
              <Link href="/dashboard/my-batches" className={styles.sectionLink}>
                View all
              </Link>
            </div>
            {!batches || batches.length === 0 ? (
              <p className={styles.emptyState}>You&apos;re not enrolled in any batch yet.</p>
            ) : (
              <div className={styles.batchGrid}>
                {batches.slice(0, 6).map((batch) => (
                  <BatchCard
                    key={batch.batchMembershipId}
                    href={`/dashboard/my-attendance?batch=${batch.batchId}`}
                    name={batch.batchName}
                    dateRange={`${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`}
                    badge={
                      batch.isCR ? (
                        <span className={styles.batchCardBadge} data-tone="success">
                          CR
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Quick actions</h2>
            </div>
            <div className={styles.quickActions}>
              <Link href="/dashboard/my-sessions" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <SessionsIcon />
                </span>
                My sessions
              </Link>
              <Link href="/dashboard/my-attendance" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <AttendanceIcon />
                </span>
                My attendance
              </Link>
              <Link href="/dashboard/checkin" className={styles.quickAction}>
                <span className={styles.quickActionIcon}>
                  <BatchesIcon />
                </span>
                Check in
              </Link>
              {isCR ? (
                <Link href="/dashboard/cr/sessions" className={styles.quickAction}>
                  <span className={styles.quickActionIcon}>
                    <CrownIcon />
                  </span>
                  CR tools
                </Link>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function DashboardHomePage() {
  const { status, role } = useAuth();

  if (status !== "authenticated" || !role) {
    return null;
  }

  return role === "STUDENT" ? <StudentDashboard /> : <MentorDashboard />;
}
