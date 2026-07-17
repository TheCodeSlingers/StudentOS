import { z } from "zod";
import { PAGINATION, SESSION_LIMITS } from "../../config/constants";

// Route 1: Create Session
export const createSessionSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(SESSION_LIMITS.TITLE_MAX_LENGTH, "Title too long"),
    scheduledStart: z.string().datetime("Invalid start time"),
    scheduledEnd: z.string().datetime("Invalid end time"),
    meetLink: z.string().url("Invalid URL format").optional(),
    description: z
      .string()
      .max(SESSION_LIMITS.DESCRIPTION_MAX_LENGTH, "Description too long")
      .optional(),
    type: z.enum(["REGULAR", "MAKEUP", "EXAM"]).optional(),
  }),
});

// Route 2: List Sessions (with pagination)
export const listSessionsSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
    status: z.enum(["SCHEDULED", "STARTED", "ENDED", "CANCELLED"]).optional(),
  }),
});

// Route 3: Get Session Details
export const getSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
});

// Route 4: Update Session
export const updateSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  body: z
    .object({
      title: z
        .string()
        .min(1, "Title cannot be empty")
        .max(SESSION_LIMITS.TITLE_MAX_LENGTH, "Title too long")
        .optional(),
      scheduledStart: z.string().datetime("Invalid start time").optional(),
      scheduledEnd: z.string().datetime("Invalid end time").optional(),
      meetLink: z.string().url("Invalid URL format").optional().nullable(),
      description: z
        .string()
        .max(SESSION_LIMITS.DESCRIPTION_MAX_LENGTH, "Description too long")
        .optional()
        .nullable(),
      type: z.enum(["REGULAR", "MAKEUP", "EXAM"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

// Route 5: Cancel Session
export const cancelSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
});

// Route 6: Open Attendance Window
export const openAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
});

// Route 7: Close Attendance Window
export const closeAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
});

// Types
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export type GetSessionInput = z.infer<typeof getSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
export type OpenAttendanceInput = z.infer<typeof openAttendanceSchema>;
export type CloseAttendanceInput = z.infer<typeof closeAttendanceSchema>;
