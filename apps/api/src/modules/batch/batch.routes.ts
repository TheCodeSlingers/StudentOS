import { Router } from "express";
import { BatchController } from "./batch.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { validateRequest } from "../../common/validation";
import {
  createBatchSchema,
  updateBatchSchema,
  allocateMemberSchema,
  listMembersSchema,
  updateMemberSchema,
  batchParamSchema,
} from "./batch.schema";

const router = Router();

router.use(authMiddleware);
router.use(requireRole(["MENTOR"]));

router.post(
  "/batches",
  validateRequest(createBatchSchema),
  BatchController.createBatch,
);

router.get("/batches", BatchController.getListBatches);

router.get(
  "/batches/:batchId",
  validateRequest(batchParamSchema),
  BatchController.getBatch,
);

router.patch(
  "/batches/:batchId",
  validateRequest(updateBatchSchema),
  BatchController.updateBatch,
);

router.post(
  "/batches/:batchId/archive",
  validateRequest(batchParamSchema),
  BatchController.archiveBatch,
);

router.post(
  "/batches/:batchId/members",
  validateRequest(allocateMemberSchema),
  BatchController.allocateMember,
);

router.get(
  "/batches/:batchId/members",
  validateRequest(listMembersSchema),
  BatchController.getListBatchMembers,
);

router.patch(
  "/batches/:batchId/members/:batchMembershipId",
  validateRequest(updateMemberSchema),
  BatchController.updateBatchMembership,
);

export default router;
