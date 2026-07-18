"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { Reveal } from "./reveal";
import styles from "./stats-section.module.css";

const STATS = [
  { value: 3, suffix: "", label: "Role-based dashboards — Mentor, Student, and CR" },
  { value: 100, suffix: "%", label: "Self-serve setup, no sales calls required" },
  { value: 5, suffix: " min", label: "Typical time from signup to first session" },
  { value: 6, suffix: "-digit", label: "Rotating attendance code, every session" },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const numberEls = section.querySelectorAll<HTMLElement>("[data-stat-value]");

    if (prefersReducedMotion) {
      numberEls.forEach((el) => {
        el.textContent = el.dataset.statValue ?? "0";
      });
      return;
    }

    const ctx = gsap.context(() => {
      numberEls.forEach((el) => {
        const target = Number(el.dataset.statValue ?? "0");
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            once: true,
          },
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value));
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.stats} ref={sectionRef}>
      <div className={styles.grid}>
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08}>
            <motion.div className={styles.card} whileHover={{ y: -6 }}>
              <p className={styles.value}>
                <span data-stat-value={stat.value}>0</span>
                {stat.suffix}
              </p>
              <p className={styles.label}>{stat.label}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
