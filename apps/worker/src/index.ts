import Redis from "ioredis";
import { Worker, Queue, Job } from "bullmq";
import express from "express";
import { createLogger } from "@platform/logger";
import { APP_PORTS } from "@platform/config";
import { validateWorkerEnv } from "@platform/validation";
import { MediaJobName } from "@platform/types";
import { PrismaClient } from "@platform/database";
import { StorageService } from "./storage.service";
import { AudioMetadataProcessor } from "./processors/audio-metadata.processor";
import { ArtworkProcessor } from "./processors/artwork.processor";
import { MediaDeletionProcessor } from "./processors/media-deletion.processor";

const logger = createLogger("worker");

// Validate environment parameters on startup. Fail early if invalid.
try {
  validateWorkerEnv(process.env);
  logger.info("✅ Worker environment configuration successfully validated");
} catch (error: any) {
  logger.error(
    "❌ Failed to start Worker: Environment validation failed",
    error,
  );
  process.exit(1);
}

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// 1. Shared Redis Connection Settings
const connectionConfig = {
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  connectTimeout: 5000,
};

logger.info("Initializing worker application...");

// 2. Redis Connection Instances
const workerRedisConnection = new Redis(redisUrl, connectionConfig);
const testQueueRedisConnection = new Redis(redisUrl, connectionConfig);

// 3. Queue & Worker Definition
const QUEUE_NAME = "media-processing";
let bullmqWorker: Worker | null = null;
let testQueue: Queue | null = null;

const prisma = new PrismaClient();
const storageService = new StorageService();
const audioProcessor = new AudioMetadataProcessor(
  storageService,
  prisma,
  logger,
);
const artworkProcessor = new ArtworkProcessor(storageService, prisma, logger);
const mediaDeletionProcessor = new MediaDeletionProcessor(
  storageService,
  prisma,
  logger,
);

try {
  // Processor logic for queue jobs
  bullmqWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing job ${job.id} of type "${job.name}"...`, {
        jobId: job.id,
        jobName: job.name,
      });

      if (job.name === MediaJobName.EXTRACT_AUDIO_METADATA) {
        return await audioProcessor.process(job);
      }

      if (job.name === MediaJobName.PROCESS_ARTWORK) {
        return await artworkProcessor.process(job);
      }

      if (job.name === MediaJobName.DELETE_MEDIA_OBJECTS) {
        return await mediaDeletionProcessor.processDeleteMediaObjects(
          job as any,
        );
      }

      if (job.name === MediaJobName.DELETE_USER_MEDIA) {
        return await mediaDeletionProcessor.processDeleteUserMedia(job as any);
      }

      if (job.name === "test-job") {
        logger.info("Successfully ran example development test job!", {
          data: job.data,
        });
        return { success: true, timestamp: new Date().toISOString() };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: workerRedisConnection,
      concurrency: process.env.WORKER_CONCURRENCY
        ? parseInt(process.env.WORKER_CONCURRENCY, 10)
        : 5,
    },
  );

  bullmqWorker.on("completed", (job) => {
    logger.info(`Job ${job.id} successfully completed`);
  });

  bullmqWorker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`, err);
  });

  // Setup example queue to schedule test jobs in development
  testQueue = new Queue(QUEUE_NAME, {
    connection: testQueueRedisConnection,
  });

  // Schedule an example test job in development environment
  if (process.env.NODE_ENV !== "production") {
    testQueue
      .add(
        "test-job",
        { message: "Hello from development worker!" },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      )
      .then((job) => {
        logger.info(`Scheduled development test job with ID: ${job.id}`);
      })
      .catch((err) => {
        logger.warn(
          "Failed to schedule development test job. Redis might be offline.",
          { error: err.message },
        );
      });
  }
} catch (error) {
  logger.error("Failed to initialize BullMQ worker/queue", error);
}

// 4. Express Health & Metrics Server on Port 4001
const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

app.get("/readiness", async (_req, res) => {
  const status = {
    status: "UP",
    redis: "DOWN",
    bullmq: "DOWN",
  };

  let healthy = true;

  try {
    const ping = await workerRedisConnection.ping();
    if (ping === "PONG") {
      status.redis = "UP";
    } else {
      healthy = false;
    }
  } catch {
    healthy = false;
  }

  if (bullmqWorker && bullmqWorker.isRunning()) {
    status.bullmq = "UP";
  } else {
    healthy = false;
  }

  status.status = healthy ? "UP" : "DOWN";

  if (!healthy) {
    res.status(503).json(status);
  } else {
    res.json(status);
  }
});

app.get("/metrics", (_req, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeWorkers: bullmqWorker ? 1 : 0,
    queueName: QUEUE_NAME,
  });
});

const healthPort = process.env.PORT || APP_PORTS.worker;
const healthServer = app.listen(healthPort, () => {
  logger.info(
    `Internal health & metrics server listening on port ${healthPort}`,
  );
});

// 5. Graceful Shutdown Handler
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  healthServer.close(() => {
    logger.info("Internal health server closed");
  });

  if (bullmqWorker) {
    logger.info("Closing BullMQ worker...");
    await bullmqWorker.close();
    logger.info("BullMQ worker closed");
  }

  logger.info("Disconnecting Redis connections...");
  workerRedisConnection.disconnect();
  testQueueRedisConnection.disconnect();
  logger.info("Redis connections disconnected");

  logger.info("Worker application shutdown complete. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
