import { Response } from "express";
import { MembershipRole } from "@prisma/client";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { BatchService } from "./batch.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class BatchController {
  static create = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const result = await BatchService.createBatch(workspaceId, req.body);
      ApiResponse.created(res, result);
    },
  );

  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const workspaceId = req.membership.workspaceId;
    const result = await BatchService.listBatches(workspaceId);
    ApiResponse.success(res, result);
  });

  static get = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const workspaceId = req.membership.workspaceId;
    const { batchId } = req.params as { batchId: string };
    const result = await BatchService.getBatch(workspaceId, batchId);
    ApiResponse.success(res, result);
  });

  static update = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const batchId = req.params.batchId as string;
      const result = await BatchService.updateBatch(
        workspaceId,
        batchId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static archive = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const batchId = req.params.batchId as string;
      const result = await BatchService.archiveBatch(workspaceId, batchId);
      ApiResponse.success(res, result);
    },
  );

  static allocate = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const batchId = req.params.batchId as string;
      const result = await BatchService.allocateMember(
        workspaceId,
        batchId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static listMembers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const batchId = req.params.batchId as string;
      const role = req.query.role as MembershipRole | undefined;
      const result = await BatchService.listBatchMembers(
        workspaceId,
        batchId,
        role,
      );
      ApiResponse.success(res, result);
    },
  );

  static updateMember = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const batchId = req.params.batchId as string;
      const batchMembershipId = req.params.batchMembershipId as string;
      const result = await BatchService.updateBatchMembership(
        workspaceId,
        batchId,
        batchMembershipId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );
}
