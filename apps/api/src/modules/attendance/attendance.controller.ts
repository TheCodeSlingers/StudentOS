import { Response } from "express";
import { AttendanceService } from "./attendance.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class AttendanceController {
  static submitAttendance = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const { code } = req.body;
      const studentMembershipId = req.membership.id;

      const result = await AttendanceService.submitAttendanceIntoDB(
        sessionId,
        studentMembershipId,
        code,
      );
      ApiResponse.created(res, result);
    },
  );

  static manualMarkAttendance = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const actorMembershipId = req.membership.id;
      const actorRole = req.membership.role;

      const result = await AttendanceService.manualMarkAttendanceIntoDB(
        sessionId,
        actorMembershipId,
        actorRole,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static getRosterAttendance = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const roster =
        await AttendanceService.getSessionAttendanceRosterFromDB(sessionId);
      ApiResponse.success(res, roster);
    },
  );

  static getHistoryAttendance = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { batchMembershipId } = req.params;
      const actorMembershipId = req.membership.id;
      const actorRole = req.membership.role;

      const history = await AttendanceService.getStudentAttendanceHistoryFromDB(
        batchMembershipId,
        actorMembershipId,
        actorRole,
      );
      ApiResponse.success(res, history);
    },
  );
}
