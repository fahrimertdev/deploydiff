import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getReviewQueue } from "@/lib/queue";
import { generateShareToken } from "@/lib/share";

// Verify GitHub webhook signature
function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Extract Vercel preview URL from PR body or comments
// GitHub Actions / Vercel bot typically posts a comment with the preview URL
function extractPreviewUrl(body: string | null): string | null {
  if (!body) return null;
  // Match common Vercel preview URL patterns
  const patterns = [
    /https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-[a-zA-Z0-9]+\.vercel\.app/,
    /https:\/\/[a-zA-Z0-9-]+\.vercel\.app/,
    /Preview:\s*(https:\/\/[^\s)]+)/i,
    /Preview URL:\s*(https:\/\/[^\s)]+)/i,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { routes: { orderBy: { sortOrder: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Verify signature if secret is configured
  if (project.webhookSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const body = await req.text();

    if (!verifySignature(project.webhookSecret, body, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    // Parse after signature check
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    return handlePayload(project, payload);
  }

  // No secret configured — parse directly (less secure, useful for testing)
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });

  return handlePayload(project, payload);
}

async function handlePayload(
  project: Awaited<ReturnType<typeof prisma.project.findUnique>> & { routes: { id: string; path: string; ignoreRules: unknown; viewportConfig: unknown }[] },
  payload: Record<string, unknown>
) {
  const event = payload.action as string;

  // Only handle opened/synchronize PR events
  if (!["opened", "synchronize", "reopened"].includes(event)) {
    return NextResponse.json({ skipped: true, reason: `action '${event}' ignored` });
  }

  const pr = payload.pull_request as Record<string, unknown> | undefined;
  if (!pr) return NextResponse.json({ skipped: true, reason: "no pull_request in payload" });

  const prNumber  = pr.number as number;
  const prTitle   = pr.title as string;
  const prBody    = pr.body as string | null;
  const headRef   = (pr.head as Record<string, unknown>)?.ref as string;

  // Try to extract preview URL from PR body
  const previewUrl = extractPreviewUrl(prBody);

  if (!previewUrl) {
    return NextResponse.json({
      skipped: true,
      reason: "No preview URL found in PR body. Add the Vercel preview URL to the PR description.",
    });
  }

  if (project!.routes.length === 0) {
    return NextResponse.json({ skipped: true, reason: "Project has no routes." });
  }

  const viewportPresets = (project!.viewportPresets as string[]) ?? ["desktop"];
  const shareToken = generateShareToken();

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        projectId: project!.id,
        shareToken,
        previewUrl,
        productionUrl: project!.productionUrl,
        sourceRef: `PR #${prNumber} — ${headRef}`,
        status: "pending",
      },
    });

    const stubs = project!.routes.flatMap((route) =>
      viewportPresets.map((vp) => ({
        reviewId: r.id,
        routeId: route.id,
        viewportLabel: vp,
      }))
    );
    await tx.reviewPage.createMany({ data: stubs });
    return r;
  });

  const queue = getReviewQueue();
  await queue.add(
    `review-${review.id}`,
    {
      reviewId: review.id,
      projectId: project!.id,
      productionUrl: project!.productionUrl,
      previewUrl,
      viewportPresets,
      routes: project!.routes.map((route) => ({
        routeId: route.id,
        path: route.path,
        ignoreRules: route.ignoreRules as string[],
      })),
    },
    { jobId: `review-${review.id}` }
  );

  console.log(`[webhook/github] Created review ${review.id} for PR #${prNumber} "${prTitle}"`);

  return NextResponse.json({ ok: true, reviewId: review.id });
}
