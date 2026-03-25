import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const guestCommentSchema = z.object({
  guestName: z.string().min(1).max(100),
  body: z.string().min(1).max(5000),
  reviewPageId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  const review = await prisma.review.findUnique({
    where: { shareToken: params.shareToken },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = guestCommentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const comment = await prisma.comment.create({
      data: {
        reviewId: review.id,
        guestName: parsed.data.guestName,
        body: parsed.data.body,
        reviewPageId: parsed.data.reviewPageId,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/share/:token/comments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
