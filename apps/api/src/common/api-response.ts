import { Response } from "express";

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, meta?: any): Response {
    return res.status(statusCode).json({
      data,
      ...(meta && { meta }),
    });
  }

  static created<T>(res: Response, data: T, meta?: any): Response {
    return this.success(res, data, 201, meta);
  }

  static accepted<T>(res: Response, data: T, meta?: any): Response {
    return this.success(res, data, 202, meta);
  }
}
