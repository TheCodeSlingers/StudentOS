import { Router } from 'express';

import attendanceRouter from '../modules/attendance/attendance.routes';
import attendanceImportRouter from '../modules/attendance-import/attendance-import.routes';
import authRouter from '../modules/auth/auth.routes';
import batchRouter from '../modules/batch/batch.routes';
import sessionRouter from '../modules/session/session.routes';
import studentRouter from '../modules/student/student.routes';
import importRouter from '../modules/student-import/import.routes';
import workspaceRouter from '../modules/workspace/workspace.routes';

const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(importRouter);
apiRouter.use(studentRouter);
apiRouter.use(attendanceRouter);
apiRouter.use(attendanceImportRouter);
apiRouter.use(batchRouter);
apiRouter.use(workspaceRouter);
apiRouter.use(sessionRouter);

export { apiRouter };
