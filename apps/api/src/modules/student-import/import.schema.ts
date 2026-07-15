import { z } from "zod";

export const importRosterSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
});

export const getSummarySchema = z.object({
  params: z.object({
    jobId: z.string().min(1, "Job ID is required"),
  }),
});

export type ImportRosterRequest = z.infer<typeof importRosterSchema>;
export type GetSummaryRequest = z.infer<typeof getSummarySchema>;
