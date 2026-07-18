import { Response } from "express";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { AttendanceService } from "./attendance.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class AttendanceController {
  static submit = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { sessionId } = req.params as { sessionId: string };
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
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { sessionId } = req.params as { sessionId: string };
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
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { sessionId } = req.params as { sessionId: string };
      const roster =
        await AttendanceService.getSessionAttendanceRoster(sessionId);
      ApiResponse.success(res, roster);
    },
  );

  static getHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { batchMembershipId } = req.params as { batchMembershipId: string };
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
