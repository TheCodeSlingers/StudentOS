import { z } from "zod";

export const createBatchSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    startDate: z.string().datetime({ message: "Invalid startDate format, must be ISO datetime" }),
    endDate: z.string().datetime({ message: "Invalid endDate format, must be ISO datetime" }).optional().nullable(),
    lateThresholdMinsOverride: z.number().int().nonnegative().optional().nullable(),
    attendanceDurationMinsOverride: z.number().int().nonnegative().optional().nullable(),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    startDate: z.string().datetime({ message: "Invalid startDate format" }).optional(),
    endDate: z.string().datetime({ message: "Invalid endDate format" }).optional().nullable(),
    lateThresholdMinsOverride: z.number().int().nonnegative().optional().nullable(),
    attendanceDurationMinsOverride: z.number().int().nonnegative().optional().nullable(),
  }),
});

export const allocateMemberSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  body: z.object({
    membershipId: z.string().min(1, "Membership ID is required"),
    isCR: z.boolean().optional(),
  }),
});

export const listMembersSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  query: z.object({
    role: z.enum(["MENTOR", "STUDENT"]).optional(),
  }),
});

export const updateMemberSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
    batchMembershipId: z.string().min(1, "Batch Membership ID is required"),
  }),
  body: z.object({
    isCR: z.boolean().optional(),
    revokedAt: z.string().datetime({ message: "Invalid revokedAt format" }).optional().nullable(),
  }),
});

export const batchParamSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type AllocateMemberInput = z.infer<typeof allocateMemberSchema>;
export type ListMembersInput = z.infer<typeof listMembersSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
