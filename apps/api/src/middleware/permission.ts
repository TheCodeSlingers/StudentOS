import { Response, NextFunction } from "express";

export function requireRole(allowedRoles: ("MENTOR" | "STUDENT")[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const membership = req.membership;
    if (!membership) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required to access this resource.",
        },
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
    }

    next();
  };
}
