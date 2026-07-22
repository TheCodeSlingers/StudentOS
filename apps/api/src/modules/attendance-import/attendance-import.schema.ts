import { z } from 'zod';

export const importAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
});

export type ImportAttendanceRequest = z.infer<typeof importAttendanceSchema>;
