import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { startImportWorker } from "./workers/import.worker";

const PORT = env.PORT;

const importWorker = startImportWorker();

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received.");

  server.close(async () => {
    if (importWorker) {
      await importWorker.close();
    }
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
