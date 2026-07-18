import { Ratelimit } from "@upstash/ratelimit";
import { NextFunction, Request, Response } from "express";
import { RATE_LIMITS } from "../config/constants";
import { redis } from "../lib/redis";

function createLimiter(
  requests: number,
  windowSeconds: number,
  prefix: string,
  identifierFn: (req: Request) => string,
) {
  if (!redis) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix,
  });

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const identifier = identifierFn(req);
      const { success, reset } = await limiter.limit(identifier);

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter,
          },
        });
        return;
      }

      next();
    } catch {
      next();
    }
  };
}

export const globalRateLimiter = createLimiter(
  RATE_LIMITS.GLOBAL.REQUESTS,
  RATE_LIMITS.GLOBAL.WINDOW_SECONDS,
  "ratelimit:global",
  (req) => req.ip ?? "unknown",
);

export const attendanceRateLimiter = createLimiter(
  RATE_LIMITS.ATTENDANCE.REQUESTS,
  RATE_LIMITS.ATTENDANCE.WINDOW_SECONDS,
  "ratelimit:attendance",
  (req) => (req as any).membershipId ?? req.ip ?? "unknown",
);

export const importRateLimiter = createLimiter(
  RATE_LIMITS.IMPORT.REQUESTS,
  RATE_LIMITS.IMPORT.WINDOW_SECONDS,
  "ratelimit:import",
  (req) => req.ip ?? "unknown",
);

export const authRateLimiter = createLimiter(
  RATE_LIMITS.AUTH.REQUESTS,
  RATE_LIMITS.AUTH.WINDOW_SECONDS,
  "ratelimit:auth",
  (req) => req.ip ?? "unknown",
);
