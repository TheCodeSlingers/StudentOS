import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "../lib/logger";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default("8000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z
    .string()
    .default("default_secret_please_change_in_production_32_chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MEMBERSHIP_CACHE_TTL_SECONDS: z.number().int().positive().default(60),
  SHUTDOWN_TIMEOUT_MS: z.number().int().positive().default(15_000),
  JSON_BODY_LIMIT: z.string().default("50kb"),
  IMPORT_WORKER_CONCURRENCY: z.number().int().positive().default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error({ error: parsed.error.format() }, "Invalid environment variables");
  process.exit(1);
}

export const env = parsed.data;
