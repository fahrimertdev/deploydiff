import { PrismaClient } from "@deploydiff/db";
import type { Job } from "bullmq";
import type { ReviewJobPayload } from "../queues.js";
import { withBrowser } from "../capture/browser.js";
import { captureScreenshot } from "../capture/screenshot.js";
import { computeDiff } from "../diff/pixelmatch.js";
import { computeSeverity } from "../diff/severity.js";
import { uploadScreenshot, buildKey } from "../storage/upload.js";

const prisma = new PrismaClient();

export async function reviewJobProcessor(
  job: Job<ReviewJobPayload>
): Promise<void> {
  const { reviewId, productionUrl, previewUrl, routes } = job.data;

  console.log(`[worker] Starting review ${reviewId} — ${routes.length} routes`);

  // ── Phase 1: Update status to capturing ─────────────────────────────────
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "capturing" },
  });

  // ── Phase 2: Capture screenshots ─────────────────────────────────────────
  const capturedPages: Array<{
    routeId: string;
    beforeBuffer: Buffer | null;
    afterBuffer: Buffer | null;
    captureError: string | null;
  }> = [];

  await withBrowser(async (browser) => {
    for (const route of routes) {
      const beforeUrl = `${productionUrl.replace(/\/$/, "")}${route.path}`;
      const afterUrl = `${previewUrl.replace(/\/$/, "")}${route.path}`;

      let beforeBuffer: Buffer | null = null;
      let afterBuffer: Buffer | null = null;
      let captureError: string | null = null;

      try {
        console.log(`[worker] Capturing ${route.path}`);

        [beforeBuffer, afterBuffer] = await Promise.all([
          captureScreenshot({
            browser,
            url: beforeUrl,
            viewport: route.viewport,
            ignoreRules: route.ignoreRules,
          }),
          captureScreenshot({
            browser,
            url: afterUrl,
            viewport: route.viewport,
            ignoreRules: route.ignoreRules,
          }),
        ]);

        // Upload screenshots
        const [beforeUrl_, afterUrl_] = await Promise.all([
          uploadScreenshot(buildKey(reviewId, route.routeId, "before"), beforeBuffer),
          uploadScreenshot(buildKey(reviewId, route.routeId, "after"), afterBuffer),
        ]);

        await prisma.reviewPage.update({
          where: {
            reviewId_routeId: { reviewId, routeId: route.routeId },
          },
          data: {
            beforeImageUrl: beforeUrl_,
            afterImageUrl: afterUrl_,
          },
        });
      } catch (err) {
        captureError = err instanceof Error ? err.message : String(err);
        console.error(`[worker] Capture failed for ${route.path}:`, captureError);

        await prisma.reviewPage.update({
          where: { reviewId_routeId: { reviewId, routeId: route.routeId } },
          data: {
            changeStatus: "error",
            captureError,
          },
        });
      }

      capturedPages.push({
        routeId: route.routeId,
        beforeBuffer,
        afterBuffer,
        captureError,
      });
    }
  });

  // ── Phase 3: Update status to diffing ────────────────────────────────────
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "diffing" },
  });

  // ── Phase 4: Compute diffs ────────────────────────────────────────────────
  const summary: Array<{
    routeId: string;
    path: string;
    label: string;
    status: string;
    severity: string | null;
  }> = [];

  for (const captured of capturedPages) {
    const route = routes.find((r) => r.routeId === captured.routeId)!;

    if (captured.captureError || !captured.beforeBuffer || !captured.afterBuffer) {
      summary.push({
        routeId: captured.routeId,
        path: route.path,
        label: route.path,
        status: "error",
        severity: null,
      });
      continue;
    }

    try {
      const { diffBuffer, diffScore } = await computeDiff(
        captured.beforeBuffer,
        captured.afterBuffer
      );

      const severity = computeSeverity(diffScore);
      const changeStatus = diffScore === 0 ? "unchanged" : "changed";

      const diffUrl = await uploadScreenshot(
        buildKey(reviewId, captured.routeId, "diff"),
        diffBuffer
      );

      await prisma.reviewPage.update({
        where: { reviewId_routeId: { reviewId, routeId: captured.routeId } },
        data: {
          diffImageUrl: diffUrl,
          diffScore,
          severity,
          changeStatus,
        },
      });

      summary.push({
        routeId: captured.routeId,
        path: route.path,
        label: route.path,
        status: changeStatus,
        severity,
      });

      console.log(
        `[worker] Diff done for ${route.path}: ${severity} (${(diffScore * 100).toFixed(2)}% changed)`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] Diff failed for ${route.path}:`, errMsg);

      await prisma.reviewPage.update({
        where: { reviewId_routeId: { reviewId, routeId: captured.routeId } },
        data: { changeStatus: "error", captureError: errMsg },
      });

      summary.push({
        routeId: captured.routeId,
        path: route.path,
        label: route.path,
        status: "error",
        severity: null,
      });
    }
  }

  // ── Phase 5: Mark review as ready ────────────────────────────────────────
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "ready",
      summary,
    },
  });

  console.log(`[worker] Review ${reviewId} complete.`);
}
