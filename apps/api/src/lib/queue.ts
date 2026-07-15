import { Queue, QueueEvents } from "bullmq";
import { env } from "../config/env";

let importQueue: Queue | null = null;
let importQueueEvents: QueueEvents | null = null;

if (env.UPSTASH_REDIS_URL) {
  const connectionOpts = {
    url: env.UPSTASH_REDIS_URL,
    tls: {},
  };

  importQueue = new Queue("student-import", {
    connection: connectionOpts as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });

  importQueueEvents = new QueueEvents("student-import", {
    connection: connectionOpts as any,
  });
}

export { importQueue, importQueueEvents };
