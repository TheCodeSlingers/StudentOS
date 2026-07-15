import { NextFunction, Response } from "express";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination";
import { WorkspaceService } from "./workspace.service";

const getWorkspace = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const workspaceId = req.membership.workspaceId;
    const workspace = await WorkspaceService.getWorkspace({ workspaceId });
    ApiResponse.success(res, workspace, 200);
  },
);

const updateWorkspaceSettings = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { timezone, defaultAttendanceDurationMins, lateThresholdMins } =
      req.body;

    const workspaceId = req.membership.workspaceId;

    const workspace = await WorkspaceService.updateWorkspaceSettings(
      workspaceId,
      {
        timezone,
        defaultAttendanceDurationMins,
        lateThresholdMins,
      },
    );

    ApiResponse.success(res, workspace, 200);
  },
);

const inviteMember = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { email, name, role } = req.body;
    const workspaceId = req.membership.workspaceId;
    const membership = await WorkspaceService.inviteMember(workspaceId, {
      email,
      name,
      role,
    });

    ApiResponse.created(res, {
      id: membership.id,
      role: membership.role,
      user: membership.user,
    });
  },
);

const listMembers = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { page, limit } = parsePagination(req.query);
    const { total, memberships } = await WorkspaceService.listMembers(
      page,
      limit,
    );

    ApiResponse.success(
      res,
      memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        user: membership.user,
      })),
      200,
      buildPaginationMeta(page, limit, total),
    );
  },
);
const deactivateMember = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const membershipId = req.params.membershipId;

    await WorkspaceService.deactivateMember(membershipId as string);

    ApiResponse.success(res, null, 200);
  },
);

export const WorkspaceController = {
  getWorkspace,
  updateWorkspaceSettings,
  inviteMember,
  listMembers,
  deactivateMember,
};
