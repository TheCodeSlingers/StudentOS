import { Response } from "express";
import { BatchService } from "./batch.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class BatchController {
  static createBatch = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const result = await BatchService.createBatchIntoDB(workspaceId, req.body);
      ApiResponse.created(res, result);
    },
  );

  static getListBatches = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const workspaceId = req.membership.workspaceId;
    const status = ["active", "archived", "all"].includes(req.query.status)
      ? req.query.status
      : "active";
    const result = await BatchService.getListBatchesFromDB(workspaceId, status);
    ApiResponse.success(res, result);
  });

  static getBatch = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const workspaceId = req.membership.workspaceId;
    const { batchId } = req.params;
    const result = await BatchService.getBatchFromDB(workspaceId, batchId);
    ApiResponse.success(res, result);
  });

  static updateBatch = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const { batchId } = req.params;
      const result = await BatchService.updateBatchIntoDB(
        workspaceId,
        batchId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static archiveBatch = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const { batchId } = req.params;
      const result = await BatchService.archiveBatchIntoDB(workspaceId, batchId);
      ApiResponse.success(res, result);
    },
  );

  static allocateMember = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const { batchId } = req.params;
      const result = await BatchService.allocateMemberIntoDB(
        workspaceId,
        batchId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );

  static getListBatchMembers = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const { batchId } = req.params;
      const { role } = req.query;
      const result = await BatchService.getListBatchMembersFromDB(
        workspaceId,
        batchId,
        role,
      );
      ApiResponse.success(res, result);
    },
  );

  static updateBatchMembership = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const workspaceId = req.membership.workspaceId;
      const { batchId, batchMembershipId } = req.params;
      const result = await BatchService.updateBatchMembershipIntoDB(
        workspaceId,
        batchId,
        batchMembershipId,
        req.body,
      );
      ApiResponse.success(res, result);
    },
  );
}
