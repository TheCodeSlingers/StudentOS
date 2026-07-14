import styles from "./Logo.module.css";

const MARK_GRADIENT_ID = "studentos-logo-gradient";

interface LogoProps {
  /** "full" renders the mark with the wordmark, "mark" renders the icon only. */
  variant?: "full" | "mark";
  /** Height in pixels; width scales to match. */
  size?: number;
  /** Renders the wordmark in a single inverse color, for use on dark/brand backgrounds. */
  inverse?: boolean;
  className?: string;
}

export function Logo({ variant = "full", size = 28, inverse = false, className }: LogoProps) {
  return (
    <span className={[styles.lockup, className].filter(Boolean).join(" ")}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="StudentOS">
        <defs>
          <linearGradient id={MARK_GRADIENT_ID} x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="var(--color-brand-400)" />
            <stop offset="1" stopColor="var(--color-brand-700)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={inverse ? "var(--color-neutral-0)" : `url(#${MARK_GRADIENT_ID})`} />
        <path
          d="M10 17.2l4.2 4.2L22 13"
          stroke={inverse ? "var(--color-primary)" : "var(--color-neutral-0)"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {variant === "full" ? (
        <span className={styles.wordmark} data-inverse={inverse}>
          Student<span className={styles.accent} data-inverse={inverse}>OS</span>
        </span>
      ) : null}
    </span>
  );
}
