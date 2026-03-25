import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const guestApproveSchema = z.object({
  guestName: z.string().min(1).max(100),
  decision: z.enum(["approved", "needs_changes"]),
  note: z.string().max(2000).optional(),
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
    const parsed = guestApproveSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const { guestName, decision, note } = parsed.data;

    const [approval] = await prisma.$transaction([
      prisma.approval.create({
        data: {
          reviewId: review.id,
          guestName,
          decision,
          note,
        },
      }),
      prisma.review.update({
        where: { id: review.id },
        data: {
          approvalStatus:
            decision === "approved" ? "approved" : "needs_changes",
        },
      }),
    ]);

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/share/:token/approve]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
