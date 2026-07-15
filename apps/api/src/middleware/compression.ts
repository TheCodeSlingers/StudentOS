import compression from "compression";
import { Request, Response } from "express";

export const compressionMiddleware = compression({
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers["accept"] === "text/event-stream") {
      return false;
    }
    return compression.filter(req, res);
  },
});
