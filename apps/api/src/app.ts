import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { setupSwagger } from "./config/swagger";
import { logger } from "./lib/logger";
import { compressionMiddleware } from "./middleware/compression";
import { errorHandler } from "./middleware/error";
import { globalRateLimiter } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";
import attendanceRouter from "./modules/attendance/attendance.routes";
import authRouter from "./modules/auth/auth.routes";
import batchRouter from "./modules/batch/batch.routes";
import importRouter from "./modules/student-import/import.routes";
import studentRouter from "./modules/student/student.routes";
import WorkspaceRouter from "./modules/workspace/workspace.route";

const app = express();

app.use(requestIdMiddleware);
app.use(helmet());
app.use(cors());
app.use(compressionMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as any).id,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);
app.use(globalRateLimiter);

app.use(express.json({ limit: "50kb" }));

setupSwagger(app);

app.use("/api/v1", authRouter);
app.use("/api/v1", importRouter);
app.use("/api/v1", studentRouter);
app.use("/api/v1", attendanceRouter);
app.use("/api/v1", batchRouter);
app.use("/api/v1", WorkspaceRouter);

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "StudentOS API",
    version: "1.0.0",
    documentation: "/api-docs",
    status: "healthy",
    uptime: process.uptime(),
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(errorHandler);

export { app };
