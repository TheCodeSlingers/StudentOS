"use client";

import { useEffect, useRef } from "react";
import styles from "./marquee.module.css";

const USE_CASES = [
  "Coaching centers",
  "Bootcamps & cohorts",
  "University departments",
  "Student clubs & councils",
  "CR-led batches",
  "Training institutes",
  "Online cohort programs",
  "Skill development centers",
];

const PX_PER_SECOND = 40;

export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const setEl = track.firstElementChild as HTMLElement | null;
    if (!setEl) return;

    const width = setEl.getBoundingClientRect().width;
    if (width > 0) {
      track.style.setProperty("--marquee-duration", `${width / PX_PER_SECOND}s`);
    }
  }, []);

  return (
    <div className={styles.marquee} aria-hidden="true">
      <div className={styles.track} ref={trackRef}>
        <div className={styles.set}>
          {USE_CASES.map((label) => (
            <span key={label} className={styles.badge}>
              {label}
            </span>
          ))}
        </div>
        <div className={styles.set}>
          {USE_CASES.map((label) => (
            <span key={`dup-${label}`} className={styles.badge}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
