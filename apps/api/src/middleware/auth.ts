import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

export async function authMiddleware(
  req: any,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required to access this resource.",
        },
      });
    }

    const cacheKey = `user:membership:${session.user.id}`;
    let membership: any = null;

    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          membership = typeof cached === "string" ? JSON.parse(cached) : cached;
        }
      } catch (err) {
        logger.warn(
          {
            err,
            cacheKey,
            userId: session.user.id,
            operation: "authMiddleware.redis.get",
          },
          "Failed to fetch membership from Redis cache",
        );
      }
    }

    if (!membership) {
      membership = await prisma.membership.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        select: {
          id: true,
          workspaceId: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (membership && redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(membership), { ex: 60 });
        } catch (err) {
          logger.warn(
            {
              err,
              cacheKey,
              userId: session.user.id,
              operation: "authMiddleware.redis.set",
            },
            "Failed to cache membership in Redis",
          );
        }
      }
    }

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
