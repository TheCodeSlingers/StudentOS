/**
 * Application-wide constants.
 *
 * These values represent business rules or domain-specific limits that
 * should behave identically across all environments (dev, staging, prod).
 * If a value legitimately needs to differ per-deployment, it belongs in
 * `config/env.ts` instead, not here.
 */

/**
 * Bulk CSV import processing.
 */
export const IMPORT = {
  /**
   * Number of CSV rows processed together in a single batch during
   * student import. Chosen as a balance between DB round-trip overhead
   * (too small = too many queries) and memory/transaction size
   * (too large = risk of long-running transactions or memory spikes).
   */
  CHUNK_SIZE: 50,
} as const;

/**
 * Session attendance-code generation.
 */
export const ATTENDANCE_CODE = {
  /** Inclusive lower bound for the generated numeric code. */
  MIN: 100_000,
  /** Inclusive upper bound for the generated numeric code. */
  MAX: 999_999,
  /**
   * Together, MIN/MAX produce a code that is always exactly 6 digits.
   * If this range changes, any client-side "enter your 6-digit code" UI
   * copy must be updated to match.
   */
} as const;

/**
 * Field length limits for the Session model, enforced at the Zod
 * validation layer. Kept here so the same limit can be referenced from
 * both the schema and anywhere else that needs to know it (e.g. a
 * frontend character counter, if one is ever built).
 */
export const SESSION_LIMITS = {
  /** Max length of `Session.title`. */
  TITLE_MAX_LENGTH: 200,
  /** Max length of `Session.description`. */
  DESCRIPTION_MAX_LENGTH: 1000,
} as const;

/**
 * Pagination defaults, shared by any paginated list endpoint.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  /** Hard ceiling — clients cannot request more than this per page. */
  MAX_LIMIT: 100,
} as const;

export const RATE_LIMITS = {
  GLOBAL: {
    /** Number of requests allowed per window */
    REQUESTS: 100,
    /** Window size in seconds */
    WINDOW_SECONDS: 60,
  },
  ATTENDANCE: {
    REQUESTS: 5,
    WINDOW_SECONDS: 60,
  },
  IMPORT: {
    REQUESTS: 3,
    WINDOW_SECONDS: 300,
  },
  AUTH: {
    REQUESTS: 5,
    WINDOW_SECONDS: 60,
  },
};
