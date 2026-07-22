import { Router } from 'express';

import { validateRequest } from '../../common/validation';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/permission';
import { importRateLimiter } from '../../middleware/rate-limit';
import { uploadSingle } from '../../middleware/upload';

import { AttendanceImportController } from './attendance-import.controller';
import { importAttendanceSchema } from './attendance-import.schema';

const router = Router();

router.post(
  '/sessions/:sessionId/attendance/import',
  authMiddleware,
  requireRole(['MENTOR']),
  importRateLimiter,
  validateRequest(importAttendanceSchema),
  uploadSingle,
  AttendanceImportController.importAttendance,
);

export default router;
