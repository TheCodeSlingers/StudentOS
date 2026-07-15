import { z } from "zod";

export const updateMembershipStatusSchema = z.object({
  body: z.object({
    timezone: z.string().trim().min(1).optional(),
    defaultAttendanceDurationMins: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    lateThresholdMins: z.coerce.number().int().nonnegative().optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().toLowerCase().email(),
    name: z.string().min(1, "name is required"),
    role: z.enum(["MENTOR", "STUDENT"]),
  }),
});

export const membershipIdParamSchema = z.object({
  params: z.object({
    membershipId: z.string().min(1, "membershipId is required"),
  }),
});

export type UpdateMembershipStatusInput = z.infer<
  typeof updateMembershipStatusSchema
>;
export type MembershipIdParamInput = z.infer<typeof membershipIdParamSchema>;
