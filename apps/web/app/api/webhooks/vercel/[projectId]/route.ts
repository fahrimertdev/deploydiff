import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getReviewQueue } from "@/lib/queue";
import { generateShareToken } from "@/lib/share";

function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = createHmac("sha1", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
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

  const rawBody = await req.text();

  // Verify signature if secret is configured
  if (project.webhookSecret) {
    const signature = req.headers.get("x-vercel-signature") ?? "";
    if (!verifySignature(project.webhookSecret, rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Vercel sends: { type: "deployment.ready" | "deployment.succeeded", payload: { ... } }
  const eventType = payload.type as string;
  if (!["deployment.ready", "deployment.succeeded"].includes(eventType)) {
    return NextResponse.json({ skipped: true, reason: `event '${eventType}' ignored` });
  }

  const deployment = payload.payload as Record<string, unknown> | undefined;
  if (!deployment) return NextResponse.json({ skipped: true, reason: "no payload" });

  // Vercel deployment URL is in deployment.url (without https://)
  const deploymentUrl = deployment.url as string | undefined;
  if (!deploymentUrl) return NextResponse.json({ skipped: true, reason: "no deployment URL" });

  const previewUrl = deploymentUrl.startsWith("http") ? deploymentUrl : `https://${deploymentUrl}`;
  const deploymentId = deployment.id as string | undefined;
  const gitRef = (deployment.meta as Record<string, string> | undefined)?.githubCommitRef ?? "";

  if (project.routes.length === 0) {
    return NextResponse.json({ skipped: true, reason: "Project has no routes." });
  }

  const viewportPresets = (project.viewportPresets as string[]) ?? ["desktop"];
  const shareToken = generateShareToken();

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        projectId: project.id,
        shareToken,
        previewUrl,
        productionUrl: project.productionUrl,
        sourceRef: gitRef || deploymentId || undefined,
        status: "pending",
      },
    });

    const stubs = project.routes.flatMap((route) =>
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
      projectId: project.id,
      productionUrl: project.productionUrl,
      previewUrl,
      viewportPresets,
      routes: project.routes.map((route) => ({
        routeId: route.id,
        path: route.path,
        ignoreRules: route.ignoreRules as string[],
      })),
    },
    { jobId: `review-${review.id}` }
  );

  console.log(`[webhook/vercel] Created review ${review.id} for deployment ${deploymentId}`);

  return NextResponse.json({ ok: true, reviewId: review.id });
}
