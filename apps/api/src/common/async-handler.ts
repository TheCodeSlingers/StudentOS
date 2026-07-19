import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request";

type AnyHandler = (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => Promise<void | Response<any, Record<string, any>>>;

export const asyncHandler =
  (fn: AnyHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as Request | AuthenticatedRequest, res, next)).catch(next);
  };
