import "dotenv/config";
import { createReviewWorker, connection } from "./queues.js";
import { reviewJobProcessor } from "./processors/reviewJob.js";

console.log("[worker] DeployDiff Worker starting...");
console.log(`[worker] REDIS_URL: ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);

const worker = createReviewWorker(reviewJobProcessor);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker] Worker error:", err);
});

// Graceful shutdown
async function shutdown() {
  console.log("[worker] Shutting down gracefully...");
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] Listening for review jobs...");
