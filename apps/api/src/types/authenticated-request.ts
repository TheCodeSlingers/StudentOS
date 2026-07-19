import { MembershipRole } from "@prisma/client";
import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
      membership?: {
        id: string;
        workspaceId: string;
        role: MembershipRole;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: NonNullable<Request["user"]>;
  membership: NonNullable<Request["membership"]>;
}
