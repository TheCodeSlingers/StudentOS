import { Request } from "express";
import { MembershipRole } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
  membership: {
    id: string;
    workspaceId: string;
    role: MembershipRole;
  };
}
