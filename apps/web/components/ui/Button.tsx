import { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export function Button({ variant = "primary", isLoading = false, disabled, children, className, ...rest }: ButtonProps) {
  return (
    <button
      className={[styles.button, styles[variant], className].filter(Boolean).join(" ")}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
