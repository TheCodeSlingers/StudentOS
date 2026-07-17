"use client";

import { InputHTMLAttributes, useId, useState } from "react";
import styles from "./TextField.module.css";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  /** Renders a show/hide toggle for password inputs. */
  revealable?: boolean;
}

export function TextField({
  label,
  error,
  revealable = false,
  type = "text",
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  const resolvedType = revealable && type === "password" ? (revealed ? "text" : "password") : type;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={resolvedType}
          className={[styles.input, revealable ? styles.hasToggle : ""].filter(Boolean).join(" ")}
          data-invalid={Boolean(error)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {revealable ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
