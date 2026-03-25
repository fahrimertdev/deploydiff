import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewQueue } from "@/lib/queue";
import { generateShareToken } from "@/lib/share";
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
    const shareToken = generateShareToken();

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

      await tx.reviewPage.createMany({
        data: project.routes.map((route) => ({
          reviewId: review.id,
          routeId: route.id,
        })),
      });

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
        routes: project.routes.map((route) => ({
          routeId: route.id,
          path: route.path,
          ignoreRules: route.ignoreRules as string[],
          viewport: route.viewportConfig as { width: number; height: number },
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
