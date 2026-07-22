import type { IAttendanceImportRowResult, IAttendanceImportSummary } from '@studentos/shared-types';

import { NotFoundError } from '../../common/errors';
import { prisma } from '../../lib/prisma';
import { parseAttendanceCSV } from '../../utils/attendance-csv-parser';

export class AttendanceImportService {
  /** Synchronous, row-by-row import — a session roster is small enough
   * (dozens of rows, not thousands) that this doesn't need the queue+worker
   * treatment the bulk student roster import uses. */
  static async importAttendanceFromCSV(
    sessionId: string,
    actorMembershipId: string,
    fileBuffer: Buffer,
    emailColumn: string,
    statusColumn: string,
  ): Promise<IAttendanceImportSummary> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, batchId: true },
    });

    if (!session) {
      throw new NotFoundError('The specified session does not exist.', 'SESSION_NOT_FOUND');
    }

    const csvRows = parseAttendanceCSV(fileBuffer, { emailColumn, statusColumn });
    const rows: IAttendanceImportRowResult[] = [];
    let successRows = 0;
    let failedRows = 0;

    for (const row of csvRows) {
      if (!row.status) {
        rows.push({
          rowNumber: row.rowNumber,
          email: row.email,
          status: 'FAILED',
          errorMessage: `Unrecognized status "${row.rawStatus}". Use Present, Absent, or Informed.`,
        });
        failedRows++;
        continue;
      }

      try {
        const user = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true },
        });

        if (!user) {
          rows.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: 'FAILED',
            errorMessage: 'No account exists for this email.',
          });
          failedRows++;
          continue;
        }

        const batchMembership = await prisma.batchMembership.findFirst({
          where: {
            batchId: session.batchId,
            revokedAt: null,
            membership: { userId: user.id },
          },
          select: { id: true },
        });

        if (!batchMembership) {
          rows.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: 'FAILED',
            errorMessage: "Not enrolled in this session's batch.",
          });
          failedRows++;
          continue;
        }

        await prisma.attendance.upsert({
          where: {
            sessionId_studentBatchMembershipId: {
              sessionId,
              studentBatchMembershipId: batchMembership.id,
            },
          },
          update: {
            status: row.status,
            method: 'MANUAL',
            markedById: actorMembershipId,
            manualReason: 'Imported from CSV',
            submittedAt: new Date(),
          },
          create: {
            sessionId,
            studentBatchMembershipId: batchMembership.id,
            status: row.status,
            method: 'MANUAL',
            markedById: actorMembershipId,
            manualReason: 'Imported from CSV',
            submittedAt: new Date(),
          },
        });

        rows.push({
          rowNumber: row.rowNumber,
          email: row.email,
          status: 'SUCCESS',
          errorMessage: null,
        });
        successRows++;
      } catch (err: any) {
        rows.push({
          rowNumber: row.rowNumber,
          email: row.email,
          status: 'FAILED',
          errorMessage: err.message || 'Could not save this row.',
        });
        failedRows++;
      }
    }

    return {
      sessionId,
      totalRows: csvRows.length,
      successRows,
      failedRows,
      rows,
    };
  }
}
