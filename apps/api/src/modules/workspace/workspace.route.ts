import { Router } from "express";
import { validateRequest } from "../../common/validation";
import { authMiddleware } from "../../middleware/auth";

import { WorkspaceController } from "./workspace.controller";
import {
  inviteMemberSchema,
  membershipIdParamSchema,
  updateWorkspaceSettingsSchema,
} from "./workspace.schema";

const router = Router();

router.get("/workspace", authMiddleware, WorkspaceController.getWorkspace);
router.patch(
  "/workspace/settings",
  validateRequest(updateWorkspaceSettingsSchema),
  authMiddleware,
  WorkspaceController.updateWorkspaceSettings,
);
router.post(
  "/workspace/members/invite",
  validateRequest(inviteMemberSchema),
  authMiddleware,
  WorkspaceController.inviteMember,
);
router.get("/workspace/members", authMiddleware, WorkspaceController.listMembers);
router.delete(
  "/workspace/members/:membershipId",
  validateRequest(membershipIdParamSchema),
  authMiddleware,
  WorkspaceController.deactivateMember,
);

export const WorkspaceRouter = router;
