import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Singleton Redis connection for BullMQ
let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return redisConnection;
}

// Queue name constant — shared with worker
export const REVIEW_QUEUE_NAME = "review-jobs";

// Singleton queue instance
let reviewQueue: Queue<ReviewJobPayload> | null = null;

export function getReviewQueue(): Queue<ReviewJobPayload> {
  if (!reviewQueue) {
    reviewQueue = new Queue<ReviewJobPayload>(REVIEW_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return reviewQueue;
}

export interface ReviewJobPayload {
  reviewId: string;
  projectId: string;
  productionUrl: string;
  previewUrl: string;
  viewportPresets: string[];
  routes: Array<{
    routeId: string;
    path: string;
    ignoreRules: string[];
  }>;
}
