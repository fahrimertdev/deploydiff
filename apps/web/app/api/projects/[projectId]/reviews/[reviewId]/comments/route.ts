import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function verifyAccess(reviewId: string, projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) return false;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.projectId !== projectId) return false;
  return true;
}

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  reviewPageId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; reviewId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ok = await verifyAccess(params.reviewId, params.projectId, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { reviewId: params.reviewId },
    include: { author: { select: { name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; reviewId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ok = await verifyAccess(params.reviewId, params.projectId, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const comment = await prisma.comment.create({
      data: {
        reviewId: params.reviewId,
        authorId: session.user.id,
        body: parsed.data.body,
        reviewPageId: parsed.data.reviewPageId,
      },
      include: { author: { select: { name: true, email: true, image: true } } },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/.../comments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
