import { Router } from "express";
import { validateRequest } from "../../common/validation";

import { WorkspaceController } from "./workspace.controller";
import {
  inviteMemberSchema,
  membershipIdParamSchema,
  updateMembershipStatusSchema,
} from "./workspace.schema";

const router = Router();

router.get("/workspace", WorkspaceController.getWorkspace);
router.patch(
  "/workspace/settings",
  validateRequest(updateMembershipStatusSchema),
  WorkspaceController.updateWorkspaceSettings,
);
router.post(
  "/workspace/members/invite",
  validateRequest(inviteMemberSchema),
  WorkspaceController.inviteMember,
);
router.get("/workspace/members", WorkspaceController.listMembers);
router.delete(
  "/workspace/members/:membershipId",
  validateRequest(membershipIdParamSchema),
  WorkspaceController.deactivateMember,
);

export const WorkspaceRouter = router;
