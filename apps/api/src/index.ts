import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import importRouter from "./modules/student-import/import.routes";
import studentRouter from "./modules/student/student.routes";
import attendanceRouter from "./modules/attendance/attendance.routes";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";

const app = express();
const PORT = env.PORT;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/v1", importRouter);
app.use("/api/v1", studentRouter);
app.use("/api/v1", attendanceRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    name: "StudentOS API",
    version: "1.0.0",
    status: "healthy",
    uptime: process.uptime(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
