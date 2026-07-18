import { Router } from "express";
import { validateRequest } from "../../common/validation";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";

import { WorkspaceController } from "./workspace.controller";
import {
  inviteMemberSchema,
  membershipIdParamSchema,
  updateWorkspaceSettingsSchema,
} from "./workspace.schema";

const router = Router();

router.use(authMiddleware);

router.get(
  "/workspace",
  WorkspaceController.getWorkspace
);

router.patch(
  "/workspace/settings",
  requireRole(["MENTOR"]),
  validateRequest(updateWorkspaceSettingsSchema),
  WorkspaceController.updateWorkspaceSettings,
);

router.post(
  "/workspace/members/invite",
  requireRole(["MENTOR"]),
  validateRequest(inviteMemberSchema),
  WorkspaceController.inviteMember,
);

router.get(
  "/workspace/members",
  requireRole(["MENTOR"]),
  WorkspaceController.getListMembers
);

router.get(
  "/workspace/my-batches",
  WorkspaceController.getMyBatches
);

router.delete(
  "/workspace/members/:membershipId",
  requireRole(["MENTOR"]),
  validateRequest(membershipIdParamSchema),
  WorkspaceController.deactivateMember,
);

export default router;