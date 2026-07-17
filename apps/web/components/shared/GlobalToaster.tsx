"use client";

import { Toaster } from "sonner";

export function GlobalToaster() {
  return (
    <Toaster
      position="top-right"
      // Expand true allows multiple toasts to stack beautifully rather than overlap flatly
      expand={true}
      // duration dictates how long it stays on screen
      duration={4000}
      // Mapping directly to your global design tokens
      toastOptions={{
        style: {
          background: "var(--color-surface-raised)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "var(--radius-lg)", // Smooth, modern corners
          boxShadow: "var(--shadow-lg)", // High-end depth
          fontFamily: "var(--font-sans)",
          padding: "var(--space-4)",
          transition: "all var(--transition-base)", // Utilizing your custom motion token
        },
        classNames: {
          // Targeting specific internal elements of the Sonner toast
          title: "font-semibold text-[var(--color-text)] text-[length:var(--font-size-base)]",
          description: "text-[var(--color-text-muted)] text-[length:var(--font-size-sm)] mt-1",
          // Action buttons inherit your brand colors
          actionButton: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-primary-hover)]",
          cancelButton: "bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-[var(--radius-sm)]",
          // Status-specific overrides
          success: "border-[var(--color-success-500)] bg-[var(--color-success-subtle)]",
          error: "border-[var(--color-danger-500)] bg-[var(--color-danger-subtle)]",
          warning: "border-[var(--color-warning-500)] bg-[var(--color-warning-subtle)]",
          info: "border-[var(--color-brand-400)] bg-[var(--color-brand-50)]",
        },
      }}
    />
  );
}