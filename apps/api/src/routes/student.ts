import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { StudentService } from "../services/student.service";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/permission";

const router = Router();

const enrollStudentSchema = z.object({
  membershipId: z.string().min(1),
  isCR: z.boolean().optional(),
});

const getStudentsQuerySchema = z.object({
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
});

const updateProfileSchema = z.object({
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  courseName: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  hireStatus: z.enum(["EMPLOYED", "JOB_SEEKING", "FREELANCING", "STUDENT_ONLY"]).optional(),
  jobType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "FREELANCE", "NOT_LOOKING"]).optional(),
  workplacePreference: z.enum(["REMOTE", "ONSITE", "HYBRID", "NO_PREFERENCE"]).optional(),
  currentEmployer: z.string().optional().nullable(),
  currentPosition: z.string().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
});

// Enrollment Endpoints
router.post(
  "/batches/:batchId/students",
  authMiddleware,
  requireRole(["MENTOR"]),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const batchId = req.params.batchId as string;
      const body = enrollStudentSchema.parse(req.body);

      const enrollment = await StudentService.enrollStudent(batchId, body.membershipId, body.isCR);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.issues },
        });
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/batches/:batchId/students",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const batchId = req.params.batchId as string;
      const query = getStudentsQuerySchema.parse(req.query);

      const students = await StudentService.getEnrolledStudents(
        batchId,
        query.page as number,
        query.limit as number
      );
      res.json(students);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/batches/:batchId/students/:batchMembershipId",
  authMiddleware,
  requireRole(["MENTOR"]),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const batchId = req.params.batchId as string;
      const batchMembershipId = req.params.batchMembershipId as string;

      const result = await StudentService.revokeEnrollment(batchId, batchMembershipId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Profile Endpoints
router.get(
  "/students/:membershipId/profile",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const profile = await StudentService.getStudentProfile(membershipId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/students/:membershipId/profile",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const data = updateProfileSchema.parse(req.body);

      const updatedProfile = await StudentService.updateStudentProfile(membershipId, data);
      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile data",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

export default router;
