import { Router } from "express";
import { ImportController } from "./import.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { uploadSingle } from "../../middleware/upload";
import { validateRequest } from "../../common/validation";
import { importRosterSchema, getSummarySchema } from "./import.schema";
import { importRateLimiter } from "../../middleware/rate-limit";

const router = Router();

router.post(
  "/batches/:batchId/students/import",
  authMiddleware,
  requireRole(["MENTOR"]),
  importRateLimiter,
  validateRequest(importRosterSchema),
  uploadSingle,
  ImportController.importRoster,
);

router.get(
  "/batches/:batchId/students/import/:jobId",
  authMiddleware,
  requireRole(["MENTOR"]),
  validateRequest(getSummarySchema),
  ImportController.getSummary,
);

router.get(
  "/batches/:batchId/students/import/:jobId/rows",
  authMiddleware,
  requireRole(["MENTOR"]),
  validateRequest(getSummarySchema),
  ImportController.getRows,
);

export default router;
