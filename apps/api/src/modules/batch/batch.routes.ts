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

router.post("/batches", validateRequest(createBatchSchema), BatchController.create);

router.get("/batches", BatchController.list);

router.get("/batches/:batchId", validateRequest(batchParamSchema), BatchController.get);

router.patch("/batches/:batchId", validateRequest(updateBatchSchema), BatchController.update);

router.post(
  "/batches/:batchId/archive",
  validateRequest(batchParamSchema),
  BatchController.archive
);

router.post(
  "/batches/:batchId/members",
  validateRequest(allocateMemberSchema),
  BatchController.allocate
);

router.get(
  "/batches/:batchId/members",
  validateRequest(listMembersSchema),
  BatchController.listMembers
);

router.patch(
  "/batches/:batchId/members/:batchMembershipId",
  validateRequest(updateMemberSchema),
  BatchController.updateMember
);

export default router;
