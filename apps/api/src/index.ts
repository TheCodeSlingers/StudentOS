import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { mainRouter } from "./routes/router";

const app = express();
const PORT = env.PORT;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
console.log(process.env.DATABASE_URL);

// Register the auth route handler for all routes starting with /api/auth/
app.all("/api/auth/*splat", toNodeHandler(auth));
// app.use("/api/v1", mainRouter);

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
