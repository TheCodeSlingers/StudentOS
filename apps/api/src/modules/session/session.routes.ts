import { Router } from "express";
import { validateRequest } from "../../common/validation";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { attendanceRateLimiter } from "../../middleware/rate-limit";
import { SessionController } from "./session.controller";
import {
  cancelSessionSchema,
  closeAttendanceSchema,
  createSessionSchema,
  getSessionSchema,
  getListSessionsSchema,
  openAttendanceSchema,
  updateSessionSchema,
} from "./session.schema";

const router = Router();

router.use(authMiddleware);

router.post(
  "/batches/:batchId/sessions",
  requireRole(["MENTOR"]),
  validateRequest(createSessionSchema),
  SessionController.createSession
);

router.get(
  "/batches/:batchId/sessions",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(getListSessionsSchema),
  SessionController.getListSessions
);

router.get(
  "/sessions/:sessionId",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(getSessionSchema),
  SessionController.getSession
);

router.patch(
  "/sessions/:sessionId",
  requireRole(["MENTOR"]),
  validateRequest(updateSessionSchema),
  SessionController.updateSession
);

router.post(
  "/sessions/:sessionId/cancel",
  requireRole(["MENTOR"]),
  validateRequest(cancelSessionSchema),
  SessionController.cancelSession
);

router.post(
  "/sessions/:sessionId/attendance/open",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(openAttendanceSchema),
  attendanceRateLimiter,
  SessionController.openAttendanceWindow
);

router.post(
  "/sessions/:sessionId/attendance/close",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(closeAttendanceSchema),
  attendanceRateLimiter,
  SessionController.closeAttendanceWindow
);

export default router;