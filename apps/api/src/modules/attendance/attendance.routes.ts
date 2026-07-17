import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { validateRequest } from "../../common/validation";
import { attendanceRateLimiter } from "../../middleware/rate-limit";
import {
  submitAttendanceSchema,
  manualAttendanceSchema,
  sessionAttendanceSchema,
  studentAttendanceSchema,
} from "./attendance.schema";

const router = Router();

router.post(
  "/sessions/:sessionId/attendance/submit",
  authMiddleware,
  requireRole(["STUDENT"]),
  attendanceRateLimiter,
  validateRequest(submitAttendanceSchema),
  AttendanceController.submit
);

router.post(
  "/sessions/:sessionId/attendance/manual",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(manualAttendanceSchema),
  AttendanceController.manualMark
);

router.get(
  "/sessions/:sessionId/attendance",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(sessionAttendanceSchema),
  AttendanceController.getRoster
);

router.get(
  "/students/:batchMembershipId/attendance",
  authMiddleware,
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(studentAttendanceSchema),
  AttendanceController.getHistory
);

export default router;
