import { z } from "zod";

export const submitAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  body: z.object({
    code: z.string().length(6, "Code must be exactly 6 characters long"),
  }),
});

export const manualAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  body: z.object({
    studentBatchMembershipId: z.string().min(1, "Student Batch Membership ID is required"),
    status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
    manualReason: z.string().min(1, "Manual reason is required"),
  }),
});

export const sessionAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
});

export const studentAttendanceSchema = z.object({
  params: z.object({
    batchMembershipId: z.string().min(1, "Batch Membership ID is required"),
  }),
});

export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
