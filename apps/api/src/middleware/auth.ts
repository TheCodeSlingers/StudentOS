import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
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

    if (process.env.NODE_ENV !== "production") {
      const membership = await prisma.membership.findFirst({
        where: { role: "MENTOR", status: "ACTIVE" },
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
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication verification.",
      },
    });
  }
}
