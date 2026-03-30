import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";
import type { ReviewJobPayload } from "../queues.js";
import { withBrowser } from "../capture/browser.js";
import { captureScreenshot } from "../capture/screenshot.js";
import { computeDiff } from "../diff/pixelmatch.js";
import { computeSeverity } from "../diff/severity.js";
import { uploadScreenshot, buildKey } from "../storage/upload.js";

const prisma = new PrismaClient();

const VIEWPORT_SIZES: Record<string, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
};

export async function reviewJobProcessor(
  job: Job<ReviewJobPayload>
): Promise<void> {
  const { reviewId, productionUrl, previewUrl, routes, viewportPresets, authCookies } = job.data;
  const presets = viewportPresets?.length ? viewportPresets : ["desktop"];

  console.log(
    `[worker] Starting review ${reviewId} — ${routes.length} routes × ${presets.join(", ")}`
  );

  // ── Phase 1: Update status to capturing ─────────────────────────────────
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "capturing" },
  });

  // ── Phase 2: Capture screenshots ─────────────────────────────────────────
  const capturedPages: Array<{
    routeId: string;
    viewportLabel: string;
    beforeBuffer: Buffer | null;
    afterBuffer: Buffer | null;
    captureError: string | null;
  }> = [];

  await withBrowser(async (browser) => {
    for (const route of routes) {
      for (const preset of presets) {
        const viewport = VIEWPORT_SIZES[preset] ?? VIEWPORT_SIZES.desktop;
        const beforeUrl = `${productionUrl.replace(/\/$/, "")}${route.path}`;
        const afterUrl  = `${previewUrl.replace(/\/$/, "")}${route.path}`;

        let beforeBuffer: Buffer | null = null;
        let afterBuffer:  Buffer | null = null;
        let captureError: string | null = null;

        try {
          console.log(`[worker] Capturing ${route.path} @ ${preset}`);

          const capture = () => Promise.all([
            captureScreenshot({ browser, url: beforeUrl, viewport, ignoreRules: route.ignoreRules, authCookies }),
            captureScreenshot({ browser, url: afterUrl,  viewport, ignoreRules: route.ignoreRules, authCookies }),
          ]);

          try {
            [beforeBuffer, afterBuffer] = await capture();
          } catch (netErr) {
            const msg = netErr instanceof Error ? netErr.message : String(netErr);
            if (msg.includes("ERR_NETWORK_CHANGED") || msg.includes("ERR_NETWORK_IO_SUSPENDED")) {
              console.warn(`[worker] Network error, retrying ${route.path} @ ${preset}...`);
              await new Promise((r) => setTimeout(r, 3000));
              [beforeBuffer, afterBuffer] = await capture();
            } else {
              throw netErr;
            }
          }

          const [beforeUrl_, afterUrl_] = await Promise.all([
            uploadScreenshot(buildKey(reviewId, route.routeId, `${preset}-before`), beforeBuffer),
            uploadScreenshot(buildKey(reviewId, route.routeId, `${preset}-after`),  afterBuffer),
          ]);

          const page = await prisma.reviewPage.findFirst({
            where: { reviewId, routeId: route.routeId, viewportLabel: preset },
          });
          if (page) {
            await prisma.reviewPage.update({
              where: { id: page.id },
              data: { beforeImageUrl: beforeUrl_, afterImageUrl: afterUrl_ },
            });
          }
        } catch (err) {
          captureError = err instanceof Error ? err.message : String(err);
          console.error(`[worker] Capture failed for ${route.path} @ ${preset}:`, captureError);

          const page = await prisma.reviewPage.findFirst({
            where: { reviewId, routeId: route.routeId, viewportLabel: preset },
          });
          if (page) {
            await prisma.reviewPage.update({
              where: { id: page.id },
              data: { changeStatus: "error", captureError },
            });
          }
        }

        capturedPages.push({ routeId: route.routeId, viewportLabel: preset, beforeBuffer, afterBuffer, captureError });
      }
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
    viewportLabel: string;
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
        viewportLabel: captured.viewportLabel,
        status: "error",
        severity: null,
      });
      continue;
    }

    try {
      const { diffBuffer, diffScore } = await computeDiff(captured.beforeBuffer, captured.afterBuffer);
      const severity     = computeSeverity(diffScore);
      const changeStatus = diffScore === 0 ? "unchanged" : "changed";

      const diffUrl = await uploadScreenshot(
        buildKey(reviewId, captured.routeId, `${captured.viewportLabel}-diff`),
        diffBuffer
      );

      const diffPage = await prisma.reviewPage.findFirst({
        where: { reviewId, routeId: captured.routeId, viewportLabel: captured.viewportLabel },
      });
      if (diffPage) {
        await prisma.reviewPage.update({
          where: { id: diffPage.id },
          data: { diffImageUrl: diffUrl, diffScore, severity, changeStatus },
        });
      }

      summary.push({
        routeId: captured.routeId,
        path: route.path,
        label: route.path,
        viewportLabel: captured.viewportLabel,
        status: changeStatus,
        severity,
      });

      console.log(
        `[worker] Diff ${route.path} @ ${captured.viewportLabel}: ${severity} (${(diffScore * 100).toFixed(2)}%)`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] Diff failed for ${route.path} @ ${captured.viewportLabel}:`, errMsg);

      const errPage = await prisma.reviewPage.findFirst({
        where: { reviewId, routeId: captured.routeId, viewportLabel: captured.viewportLabel },
      });
      if (errPage) {
        await prisma.reviewPage.update({
          where: { id: errPage.id },
          data: { changeStatus: "error", captureError: errMsg },
        });
      }

      summary.push({
        routeId: captured.routeId,
        path: route.path,
        label: route.path,
        viewportLabel: captured.viewportLabel,
        status: "error",
        severity: null,
      });
    }
  }

  // ── Phase 5: Mark review as ready ────────────────────────────────────────
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "ready", summary },
  });

  console.log(`[worker] Review ${reviewId} complete.`);
}
