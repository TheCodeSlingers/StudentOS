import { MembershipRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: { id: string; email: string; name: string };
      membership: { id: string; workspaceId: string; role: MembershipRole };
    }
  }
}
