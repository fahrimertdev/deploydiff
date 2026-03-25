import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getReviewOrFail(
  reviewId: string,
  projectId: string,
  userId: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) return null;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      pages: {
        include: { route: true },
        orderBy: { route: { sortOrder: "asc" } },
      },
      comments: {
        include: { author: { select: { name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!review || review.projectId !== projectId) return null;
  return review;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; reviewId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const review = await getReviewOrFail(
    params.reviewId,
    params.projectId,
    session.user.id
  );
  if (!review)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ review });
}
