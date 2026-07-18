import { Response } from "express";
import { SessionStatus } from "@prisma/client";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { SessionService } from "./session.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class SessionController {
  // Route 1: Create Session
  static createSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const batchId = req.params.batchId as string;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.createSession(
        batchId,
        workspaceId,
        req.body
      );
      ApiResponse.created(res, session);
    }
  );

  // Route 2: List Sessions (with pagination)
  static listSessions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const batchId = req.params.batchId as string;
      const workspaceId = req.membership.workspaceId;
      const userId = req.user.id;
      const role = req.membership.role;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const status = req.query.status as SessionStatus | undefined;

      const result = await SessionService.listSessions(
        batchId,
        workspaceId,
        userId,
        role,
        page,
        limit,
        status
      );

      ApiResponse.success(res, result.data, 200, result.meta);
    }
  );

  // Route 3: Get Session Details
  static getSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const sessionId = req.params.sessionId as string;
      const workspaceId = req.membership.workspaceId;
      const userId = req.user.id;
      const role = req.membership.role;
      const session = await SessionService.getSession(
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
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const sessionId = req.params.sessionId as string;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.updateSession(
        sessionId,
        workspaceId,
        req.body
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 5: Cancel Session
  static cancelSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const sessionId = req.params.sessionId as string;
      const workspaceId = req.membership.workspaceId;
      const session = await SessionService.cancelSession(
        sessionId,
        workspaceId
      );
      ApiResponse.success(res, session);
    }
  );

  // Route 6: Open Attendance Window
  static openAttendance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const sessionId = req.params.sessionId as string;
      const workspaceId = req.membership.workspaceId;
      const membershipId = req.membership.id;
      const role = req.membership.role;
      const userId = req.user.id; // For rate limiting
      const session = await SessionService.openAttendanceWindow(
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
  static closeAttendance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const sessionId = req.params.sessionId as string;
      const workspaceId = req.membership.workspaceId;
      const membershipId = req.membership.id;
      const role = req.membership.role;
      const userId = req.user.id; // For rate limiting
      const session = await SessionService.closeAttendanceWindow(
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
