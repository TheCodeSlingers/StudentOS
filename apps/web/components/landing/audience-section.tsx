"use client";

import { motion, type Variants } from "framer-motion";
import { Reveal } from "./reveal";
import styles from "./audience-section.module.css";

const AUDIENCES = [
  {
    title: "Coaching centers",
    description: "Run multiple batches across subjects and instructors from a single admin-free workspace.",
    icon: BuildingIcon,
  },
  {
    title: "Bootcamps & cohorts",
    description: "Track fast-moving cohorts session by session, with attendance history that never falls behind.",
    icon: RocketIcon,
  },
  {
    title: "University departments",
    description: "Give faculty a lightweight way to manage sections without waiting on campus IT.",
    icon: GraduationIcon,
  },
  {
    title: "Student clubs & CR teams",
    description: "Let class representatives open sessions and mark attendance without full mentor access.",
    icon: UsersGroupIcon,
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut", delay: index * 0.08 },
  }),
};

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 17V4.5a1 1 0 011-1h6a1 1 0 011 1V17M4 17h9M4 17H2.5M13 17h4.5M13 17V8a1 1 0 011-1h2.5a1 1 0 011 1v9M7 6.5h2M7 9.5h2M7 12.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5c2.5 1.4 4 4 4 7.3 0 1.6-.4 2.9-1 4l-3-1-3 1c-.6-1.1-1-2.4-1-4 0-3.3 1.5-5.9 4-7.3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="8.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 13.5L6 17l3-1.5M12.5 13.5L14 17l-3-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l8 4-8 4-8-4 8-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 9v3.8c0 1.2 2 2.7 4.5 2.7s4.5-1.5 4.5-2.7V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 7v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="13.5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.3 16.3c.4-2.3 2-3.8 4.2-3.8s3.8 1.5 4.2 3.8M9.3 16.3c.4-2.3 2-3.8 4.2-3.8s3.8 1.5 4.2 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AudienceSection() {
  return (
    <section className={styles.audience}>
      <Reveal className={styles.heading}>
        <span className={styles.eyebrow}>Who it&apos;s for</span>
        <h2>Built for anyone who runs recurring sessions</h2>
        <p>If your organization tracks attendance across batches or cohorts, StudentOS fits.</p>
      </Reveal>

      <div className={styles.grid}>
        {AUDIENCES.map((audience, index) => {
          const Icon = audience.icon;
          return (
            <motion.div
              key={audience.title}
              className={styles.card}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              whileHover={{ y: -6 }}
              variants={cardVariants}
            >
              <motion.span
                className={styles.icon}
                whileHover={{ scale: 1.15, rotate: -8 }}
                transition={{ type: "spring", stiffness: 320, damping: 14 }}
              >
                <Icon />
              </motion.span>
              <h3>{audience.title}</h3>
              <p>{audience.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
