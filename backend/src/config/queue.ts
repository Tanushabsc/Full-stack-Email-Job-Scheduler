import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const EMAIL_QUEUE = "email-scheduler";

export const emailQueue = new Queue(EMAIL_QUEUE, {
  connection: redisConnection,

  defaultJobOptions: {
    attempts: 5,

    backoff: {
      type: "exponential",
      delay: 2000,
    },

    removeOnComplete: {
      count: 1000,
    },

    removeOnFail: {
      count: 1000,
    },
  },
});