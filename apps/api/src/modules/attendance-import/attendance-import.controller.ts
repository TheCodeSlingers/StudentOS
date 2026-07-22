import type { Response } from 'express';

import { ApiResponse } from '../../common/api-response';
import { asyncHandler } from '../../common/async-handler';
import { BadRequestError } from '../../common/errors';

import { AttendanceImportService } from './attendance-import.service';

export class AttendanceImportController {
  static importAttendance = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const actorMembershipId = req.membership.id;
    const file = req.file;
    const { emailColumn, statusColumn } = req.body;

    if (!file) {
      throw new BadRequestError("CSV file is required under the 'file' field.", 'MISSING_FILE');
    }

    if (!emailColumn || !statusColumn) {
      throw new BadRequestError(
        "Both 'emailColumn' and 'statusColumn' are required.",
        'MISSING_COLUMN_SELECTION',
      );
    }

    const summary = await AttendanceImportService.importAttendanceFromCSV(
      sessionId,
      actorMembershipId,
      file.buffer,
      emailColumn,
      statusColumn,
    );

    ApiResponse.success(res, summary);
  });
}
