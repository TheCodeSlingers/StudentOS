"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import styles from "./analytics.module.css";
import {
  PlacementMetric,
  SkillMetric,
  TopLevelStats,
} from "./analytics.interface";
import { StatCard } from "@/components/dashboard/StatCard";
import { PlacementDonutChart } from "@/components/dashboard/PlacementDonutChart";
import { SkillsBarChart } from "@/components/dashboard/SkillsBarChart";
import { useRequireRole } from "@/lib/use-require-role";

// This enum is defined here for mock data purposes.
// In a real app, it would be imported from a shared location.
const HireStatus = {
  ACTIVELY_LOOKING: "ACTIVELY_LOOKING",
  EMPLOYED: "EMPLOYED",
  STUDENT_ONLY: "STUDENT_ONLY",
} as const;

// --- MOCK DATA LAYER ---
// This would be replaced by an API call
const mockStudentProfiles = [
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "Next.js, TypeScript, PostgreSQL",
  },
  { hireStatus: HireStatus.EMPLOYED, skills: "React, Node.js, MongoDB" },
  { hireStatus: HireStatus.STUDENT_ONLY, skills: "HTML, CSS, JavaScript" },
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "Next.js, GraphQL, Prisma",
  },
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "TypeScript, Python, Docker",
  },
  { hireStatus: HireStatus.EMPLOYED, skills: "Next.js, Tailwind CSS, Vercel" },
  { hireStatus: HireStatus.STUDENT_ONLY, skills: "Java, Spring Boot" },
  { hireStatus: HireStatus.ACTIVELY_LOOKING, skills: "Next.js, Prisma, tRPC" },
  { hireStatus: HireStatus.EMPLOYED, skills: "React, Redux, Firebase" },
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "TypeScript, Go, Kubernetes",
  },
  { hireStatus: HireStatus.STUDENT_ONLY, skills: "JavaScript, Vue.js" },
  { hireStatus: HireStatus.EMPLOYED, skills: "Next.js, Python, FastAPI" },
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "TypeScript, Node.js, AWS",
  },
  {
    hireStatus: HireStatus.ACTIVELY_LOOKING,
    skills: "Next.js, Prisma, PostgreSQL",
  },
  { hireStatus: HireStatus.EMPLOYED, skills: "React, Node.js" },
];

const processMockData = () => {
  const placementData: Omit<PlacementMetric, "color">[] = [
    { status: "Actively Looking", count: 0 },
    { status: "Employed", count: 0 },
    { status: "Student Only", count: 0 },
  ];
  const skillCounts: { [key: string]: number } = {};
  let totalSkills = 0;

  mockStudentProfiles.forEach((profile) => {
    if (profile.hireStatus === HireStatus.ACTIVELY_LOOKING)
      placementData[0].count++;
    else if (profile.hireStatus === HireStatus.EMPLOYED)
      placementData[1].count++;
    else if (profile.hireStatus === HireStatus.STUDENT_ONLY)
      placementData[2].count++;

    const skills = profile.skills.split(",").map((s) => s.trim());
    totalSkills += skills.length;
    skills.forEach((skill) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });

  const topSkills: SkillMetric[] = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([skill, count]) => ({ skill, count }))
    .reverse();

  const stats: TopLevelStats = {
    totalStudents: mockStudentProfiles.length,
    activelyLooking: placementData[0].count,
    employed: placementData[1].count,
    avgSkills: parseFloat(
      (totalSkills / mockStudentProfiles.length).toFixed(1),
    ),
  };

  return { placementData, topSkills, stats };
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// --- ICONS ---
const BriefcaseIcon = () => (
  <svg
    className={styles.statCardIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);
const UsersIcon = () => (
  <svg
    className={styles.statCardIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const SearchIcon = () => (
  <svg
    className={styles.statCardIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const CodeIcon = () => (
  <svg
    className={styles.statCardIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

export default function MentorAnalyticsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [stats, setStats] = useState<TopLevelStats | null>(null);
  const [placementData, setPlacementData] = useState<PlacementMetric[]>([]);
  const [skillsData, setSkillsData] = useState<SkillMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthorized) return;
    // Simulate fetching and processing data
    const timer = setTimeout(() => {
      const {
        stats: processedStats,
        placementData: processedPlacementData,
        topSkills,
      } = processMockData();

      setStats(processedStats);
      setSkillsData(topSkills);

      // Add colors for the donut chart.
      // Using hex codes directly as Recharts' `fill` prop doesn't always resolve CSS variables.
      // These colors are derived from the design tokens in globals.css.
      const PLACEMENT_COLORS = ["#d97706", "#16a34a", "#64748b"]; // warning-500, success-500, neutral-500
      setPlacementData(
        processedPlacementData.map((d, i) => ({
          ...d,
          color: PLACEMENT_COLORS[i],
        })),
      );

      setIsLoading(false);
    }, 800); // Simulate network delay

    return () => clearTimeout(timer);
  }, [isAuthorized]);

  if (!isAuthorized) {
    return null;
  }

  if (isLoading) {
    // A simple loading state
    return <div className="p-8">Loading analytics dashboard...</div>;
  }

  return (
    <motion.div
      className={styles.grid}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={<UsersIcon />}
          variants={itemVariants}
        />
        <StatCard
          title="Actively Looking"
          value={stats?.activelyLooking ?? 0}
          icon={<SearchIcon />}
          variants={itemVariants}
        />
        <StatCard
          title="Already Employed"
          value={stats?.employed ?? 0}
          icon={<BriefcaseIcon />}
          variants={itemVariants}
        />
        <StatCard
          title="Avg. Skills Listed"
          value={stats?.avgSkills ?? 0}
          icon={<CodeIcon />}
          variants={itemVariants}
        />
      </div>

      <div className={styles.chartsGrid}>
        <motion.div className={styles.chartCard} variants={itemVariants}>
          <div className={styles.chartHeader}>
            <h2>Placement Status</h2>
            <p>Distribution of students by current hiring status.</p>
          </div>
          <PlacementDonutChart data={placementData} />
        </motion.div>

        <motion.div className={styles.chartCard} variants={itemVariants}>
          <div className={styles.chartHeader}>
            <h2>Top 7 Technical Skills</h2>
            <p>Most frequently listed skills across all student profiles.</p>
          </div>
          <SkillsBarChart data={skillsData} />
        </motion.div>
      </div>
    </motion.div>
  );
}
