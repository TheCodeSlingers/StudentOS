import { Request, Response, NextFunction } from "express";
import { ApiError } from "../common/errors";
import { logger } from "../lib/logger";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as any).id;

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, "Internal server error");
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(requestId && { requestId }),
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  logger.error({ requestId, err }, "Unhandled error");

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred on the server.",
      ...(requestId && { requestId }),
    },
  });
}
