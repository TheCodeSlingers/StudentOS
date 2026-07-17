import { z } from "zod";

export const enrollStudentSchema = z.object({
  body: z.object({
    membershipId: z.string().min(1),
    isCR: z.boolean().optional(),
  }),
});

export const getStudentsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(1 as any),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(10 as any),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
    courseName: z.string().optional().nullable(),
    specialization: z.string().optional().nullable(),
    skills: z.array(z.string()).optional(),
    hireStatus: z.enum(["EMPLOYED", "JOB_SEEKING", "FREELANCING", "STUDENT_ONLY"]).optional(),
    jobType: z
      .enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "FREELANCE", "NOT_LOOKING"])
      .optional(),
    workplacePreference: z.enum(["REMOTE", "ONSITE", "HYBRID", "NO_PREFERENCE"]).optional(),
    currentEmployer: z.string().optional().nullable(),
    currentPosition: z.string().optional().nullable(),
    portfolioUrl: z.string().url().optional().nullable(),
    linkedinUrl: z.string().url().optional().nullable(),
  }),
});
