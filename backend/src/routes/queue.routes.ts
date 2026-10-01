import { Router } from "express";
import { Queue } from "bullmq";

import { redisConnection } from "../config/redis";
import { EMAIL_QUEUE } from "../config/queue";

export const queueRouter = Router();

queueRouter.get("/counts", async (_req, res, next) => {
  try {
    const queue = new Queue(EMAIL_QUEUE, {
      connection: redisConnection,
    });

    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    await queue.close();

    res.json({
      queue: EMAIL_QUEUE,
      counts,
    });
  } catch (error) {
    next(error);
  }
});

queueRouter.get("/health", async (_req, res) => {
  res.json({
    redis: redisConnection.status,
    queue: EMAIL_QUEUE,
    timestamp: new Date().toISOString(),
  });
});