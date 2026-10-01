import IORedis from "ioredis";

const redisUrl =
  process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const redisConnection = redis;

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});