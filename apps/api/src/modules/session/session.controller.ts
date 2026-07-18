import { Response } from "express";
import { SessionService } from "./session.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class SessionController {
  // Route 1: Create Session
  static createSession = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { batchId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.createSessionIntoDB(
        batchId,
        workspaceId,
        req.body
      );
      ApiResponse.created(res, session);
    }
  );

  // Route 2: List Sessions (with pagination)
  static getListSessions = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { batchId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const userId = req.user.id;
      const role = req.membership.role;
      const { page, limit, status, cursor } = req.query;

      const result = await SessionService.getlistSessionsFromDB(
        batchId,
        workspaceId,
        userId,
        role,
        page,
        limit,
        status,
        cursor
      );

      ApiResponse.success(res, result.data, 200, result.meta);
    }
  );

  // Route 3: Get Session Details
  static getSession = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const userId = req.user.id;
      const role = req.membership.role;
      const session = await SessionService.getSessionFromDB(
        sessionId,
        workspaceId,
        userId,
        role
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 4: Update Session
  static updateSession = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.updateSessionIntoDB(
        sessionId,
        workspaceId,
        req.body
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 5: Cancel Session
  static cancelSession = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.cancelSessionIntoDB(
        sessionId,
        workspaceId
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 6: Open Attendance Window
  static openAttendanceWindow = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const membershipId = req.membership.id;
      const role = req.membership.role;
      const userId = req.user.id; // For rate limiting
      const session = await SessionService.openAttendanceWindowIntoDB(
        sessionId,
        workspaceId,
        membershipId,
        role,
        userId
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 7: Close Attendance Window
  static closeAttendanceWindow = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      const workspaceId = req.membership.workspaceId;
      const membershipId = req.membership.id;
      const role = req.membership.role;
      const userId = req.user.id; // For rate limiting
      const session = await SessionService.closeAttendanceWindowIntoDB(
        sessionId,
        workspaceId,
        membershipId,
        role,
        userId
      );
      ApiResponse.success(res, session);
    }
  );
}
