import { Request, Response, NextFunction } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
