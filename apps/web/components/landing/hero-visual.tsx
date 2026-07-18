"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import styles from "@/app/page.module.css";

const ROSTER = [
  { name: "Aarav Sharma", late: false },
  { name: "Priya Nair", late: false },
  { name: "Rahul Verma", late: true },
];

export function HeroVisual() {
  const windowRef = useRef<HTMLDivElement>(null);
  const floatTween = useRef<gsap.core.Tween | null>(null);

  function startFloat() {
    const el = windowRef.current;
    if (!el || floatTween.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    floatTween.current = gsap.to(el, {
      y: -10,
      duration: 2.6,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      force3D: true,
    });
  }

  useEffect(() => {
    return () => {
      floatTween.current?.kill();
      floatTween.current = null;
    };
  }, []);

  return (
    <motion.div
      className={styles.mockWindow}
      aria-hidden="true"
      ref={windowRef}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      onAnimationComplete={startFloat}
    >
      <div className={styles.mockTopBar}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.mockBody}>
        <div className={styles.mockCodeCard}>
          <p className={styles.mockLabel}>Session · Data Structures — Batch 12</p>
          <div className={styles.mockCode}>4 8 1 2 5 9</div>
          <p className={styles.mockTimer}>
            <span className={styles.liveDot} />
            Attendance window closes in 04:12
          </p>
        </div>
        <div className={styles.mockRoster}>
          {ROSTER.map((student) => (
            <div key={student.name} className={styles.mockRow}>
              <span>{student.name}</span>
              <span className={styles.mockBadge} data-tone={student.late ? "warning" : "success"}>
                {student.late ? "Late" : "Present"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
