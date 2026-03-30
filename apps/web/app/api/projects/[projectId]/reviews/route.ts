import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewQueue } from "@/lib/queue";
import { generateShareToken } from "@/lib/share";
import { validateUrl, UrlValidationError } from "@/lib/validateUrl";
import { assertPreviewAuthorized, PreviewAuthError } from "@/lib/previewAuth";
import { decrypt } from "@/lib/encrypt";
import { z } from "zod";

const createReviewSchema = z.object({
  previewUrl: z.string().url(),
  sourceRef: z.string().max(200).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });
  if (!project || project.ownerId !== session.user.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { pages: true, comments: true } },
    },
  });

  return NextResponse.json({ reviews });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { routes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project || project.ownerId !== session.user.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (project.routes.length === 0) {
    return NextResponse.json(
      { error: "Add at least one route before creating a review." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const { previewUrl, sourceRef } = parsed.data;

    try {
      await validateUrl(previewUrl);
    } catch (err) {
      if (err instanceof UrlValidationError)
        return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    try {
      assertPreviewAuthorized(previewUrl, project.productionUrl, project.allowedPreviewHosts);
    } catch (err) {
      if (err instanceof PreviewAuthError)
        return NextResponse.json({ error: err.message }, { status: 403 });
      throw err;
    }

    const shareToken = generateShareToken();

    const viewportPresets = (project.viewportPresets as string[]) ?? ["desktop"];

    // Create the review and all ReviewPage stubs in a transaction
    const review = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          projectId: project.id,
          shareToken,
          previewUrl,
          productionUrl: project.productionUrl,
          sourceRef,
          status: "pending",
        },
      });

      // One stub per route × viewport
      const stubs = project.routes.flatMap((route) =>
        viewportPresets.map((vp) => ({
          reviewId: review.id,
          routeId: route.id,
          viewportLabel: vp,
        }))
      );
      await tx.reviewPage.createMany({ data: stubs });

      return review;
    });

    // Enqueue the capture + diff job
    const queue = getReviewQueue();
    await queue.add(
      `review-${review.id}`,
      {
        reviewId: review.id,
        projectId: project.id,
        productionUrl: project.productionUrl,
        previewUrl,
        viewportPresets,
        authCookies: (() => {
          if (!project.authCookies) return null;
          // Must be iv:authTag:ciphertext format — ignore legacy plaintext values
          const parts = project.authCookies.split(":");
          if (parts.length !== 3) return null;
          try { return decrypt(project.authCookies); } catch { return null; }
        })(),
        routes: project.routes.map((route) => ({
          routeId: route.id,
          path: route.path,
          ignoreRules: route.ignoreRules as string[],
        })),
      },
      { jobId: `review-${review.id}` }
    );

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects/:id/reviews]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
