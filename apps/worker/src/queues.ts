import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const REVIEW_QUEUE_NAME = "review-jobs";

export interface ReviewJobPayload {
  reviewId: string;
  projectId: string;
  productionUrl: string;
  previewUrl: string;
  routes: Array<{
    routeId: string;
    path: string;
    ignoreRules: string[];
    viewport: { width: number; height: number };
  }>;
}

export function createReviewWorker(
  processor: (job: { id: string; data: ReviewJobPayload }) => Promise<void>
) {
  return new Worker<ReviewJobPayload>(REVIEW_QUEUE_NAME, processor, {
    connection,
    concurrency: 2,
  });
}
