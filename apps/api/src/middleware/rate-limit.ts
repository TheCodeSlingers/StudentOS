import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../lib/redis";

function createLimiter(
  requests: number,
  windowSeconds: number,
  prefix: string,
  identifierFn: (req: Request) => string
) {
  if (!redis) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  100,
  60,
  "ratelimit:global",
  (req) => req.ip ?? "unknown"
);

export const attendanceRateLimiter = createLimiter(
  5,
  60,
  "ratelimit:attendance",
  (req) => (req as any).membershipId ?? req.ip ?? "unknown"
);

export const importRateLimiter = createLimiter(
  3,
  300,
  "ratelimit:import",
  (req) => req.ip ?? "unknown"
);

export const authRateLimiter = createLimiter(5, 60, "ratelimit:auth", (req) => req.ip ?? "unknown");
