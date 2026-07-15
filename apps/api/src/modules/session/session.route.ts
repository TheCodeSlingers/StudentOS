import { Router } from "express";
import { SessionController } from "./session.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { validateRequest } from "../../common/validation";
import {
  createSessionSchema,
  listSessionsSchema,
  getSessionSchema,
  updateSessionSchema,
  cancelSessionSchema,
  openAttendanceSchema,
  closeAttendanceSchema,
} from "./session.schema";

const router = Router();

router.use(authMiddleware);

// Route 1: Create Session (MENTOR only)
router.post(
  "/batches/:batchId/sessions",
  requireRole(["MENTOR"]),
  validateRequest(createSessionSchema),
  SessionController.createSession
);

// Route 2: List Sessions (MENTOR and STUDENT)
router.get(
  "/batches/:batchId/sessions",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(listSessionsSchema),
  SessionController.listSessions
);

// Route 3: Get Session Details (MENTOR and STUDENT)
router.get(
  "/sessions/:sessionId",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(getSessionSchema),
  SessionController.getSession
);

// Route 4: Update Session (MENTOR only)
router.patch(
  "/sessions/:sessionId",
  requireRole(["MENTOR"]),
  validateRequest(updateSessionSchema),
  SessionController.updateSession
);

// Route 5: Cancel Session (MENTOR only)
router.post(
  "/sessions/:sessionId/cancel",
  requireRole(["MENTOR"]),
  validateRequest(cancelSessionSchema),
  SessionController.cancelSession
);

// Route 6: Open Attendance Window (MENTOR and CR)
router.post(
  "/sessions/:sessionId/attendance/open",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(openAttendanceSchema),
  SessionController.openAttendance
);

// Route 7: Close Attendance Window (MENTOR and CR)
router.post(
  "/sessions/:sessionId/attendance/close",
  requireRole(["MENTOR", "STUDENT"]),
  validateRequest(closeAttendanceSchema),
  SessionController.closeAttendance
);

export default router;
