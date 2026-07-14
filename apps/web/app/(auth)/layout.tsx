import { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import styles from "./layout.module.css";

const FEATURES = [
  "Rotating-code attendance with automated fraud review",
  "Batches, sessions, and student rosters kept in sync",
  "Role-based access for admins, mentors, and class reps",
];

function FeatureIcon() {
  return (
    <svg className={styles.featureIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="rgb(34 197 94 / 0.25)" />
      <path d="M6 10.2l2.5 2.5L14 7.5" stroke="var(--color-brand-400)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.marketingPanel}>
        <Logo variant="full" inverse />

        <div className={styles.headline}>
          <h1>Run attendance, batches, and student records from one place.</h1>
          <p>StudentOS gives coaching centers and student organizations a single workspace for daily operations.</p>
        </div>

        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature}>
              <FeatureIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <p className={styles.footnote}>© {new Date().getFullYear()} StudentOS. All rights reserved.</p>
      </aside>

      <div className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <Logo variant="full" />
        </div>
        <div className={styles.formContent}>{children}</div>
      </div>
    </div>
  );
}
