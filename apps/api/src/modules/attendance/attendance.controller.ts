import { Response } from "express";
import { AttendanceService } from "./attendance.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class AttendanceController {
  static submit = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const { code } = req.body;
      const studentMembershipId = req.membership.id;

      const result = await AttendanceService.submitAttendance(
        sessionId,
        studentMembershipId,
        code,
      );
      ApiResponse.created(res, result);
    },
  );

  static manualMark = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const actorMembershipId = req.membership.id;
      const actorRole = req.membership.role;

      const result = await AttendanceService.manualMarkAttendance(
        sessionId,
        actorMembershipId,
        actorRole,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static getRoster = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const roster =
        await AttendanceService.getSessionAttendanceRoster(sessionId);
      ApiResponse.success(res, roster);
    },
  );

  static getHistory = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { batchMembershipId } = req.params;
      const actorMembershipId = req.membership.id;
      const actorRole = req.membership.role;

      const history = await AttendanceService.getStudentAttendanceHistory(
        batchMembershipId,
        actorMembershipId,
        actorRole,
      );
      ApiResponse.success(res, history);
    },
  );
}
