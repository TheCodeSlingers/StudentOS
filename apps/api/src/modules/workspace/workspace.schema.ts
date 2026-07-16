import { z } from "zod";

export const updateMembershipStatusSchema = z.object({
  body: z.object({
    timezone: z.string().trim().min(1).optional(),
    defaultAttendanceDurationMins: z.number().int().positive().optional(),
    lateThresholdMins: z.number().int().nonnegative().optional(),
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

export const workspaceIdSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
  }),
});

export const listMembersSchema = z.object({
  query: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().default(10),
  }),
});

export type UpdateMembershipStatusInput = z.infer<
  typeof updateMembershipStatusSchema
>;
export type MembershipIdParamInput = z.infer<typeof membershipIdParamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type WorkspaceIdParamInput = z.infer<typeof workspaceIdSchema>;
export type ListMembersInput = z.infer<typeof listMembersSchema>;
