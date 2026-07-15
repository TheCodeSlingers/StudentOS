import { Router } from "express";
import { z } from "zod";
import { StudentController } from "./student.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { validateRequest } from "../../common/validation";

import {
  enrollStudentSchema,
  getStudentsQuerySchema,
  updateProfileSchema,
} from "./student.schema";

const router = Router();

// Enrollment Endpoints
router.post(
  "/batches/:batchId/students",
  authMiddleware,
  requireRole(["MENTOR"]),
  validateRequest(enrollStudentSchema),
  StudentController.enrollStudent,
);

router.get(
  "/batches/:batchId/students",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(getStudentsQuerySchema),
  StudentController.getEnrolledStudents,
);

router.delete(
  "/batches/:batchId/students/:batchMembershipId",
  authMiddleware,
  requireRole(["MENTOR"]),
  StudentController.revokeEnrollment,
);

// Profile Endpoints
router.get(
  "/students/:membershipId/profile",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  StudentController.getStudentProfile,
);

router.patch(
  "/students/:membershipId/profile",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(updateProfileSchema),
  StudentController.updateStudentProfile,
);

export default router;
