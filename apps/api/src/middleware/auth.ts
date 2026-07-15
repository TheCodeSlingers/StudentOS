import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";

export async function authMiddleware(
  req: any,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      if (process.env.NODE_ENV !== "production") {
        const mockRole = req.headers["x-mock-role"] || "MENTOR";
        const membership = await prisma.membership.findFirst({
          where: { role: mockRole as any, status: "ACTIVE" },
          include: { user: true },
        });

        if (membership) {
          req.user = {
            id: membership.user.id,
            email: membership.user.email,
            name: membership.user.name,
          };
          req.membership = {
            id: membership.id,
            workspaceId: membership.workspaceId,
            role: membership.role,
          };
          return next();
        }
      }

      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required to access this resource.",
        },
      });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { user: true },
    });

    if (!membership) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message:
            "You do not have a valid active membership in this workspace.",
        },
      });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    req.membership = {
      id: membership.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication verification.",
      },
    });
  }
}
