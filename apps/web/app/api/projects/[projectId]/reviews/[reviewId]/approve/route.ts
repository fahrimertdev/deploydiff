import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const approveSchema = z.object({
  decision: z.enum(["approved", "needs_changes"]),
  note: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; reviewId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });
  if (!project || project.ownerId !== session.user.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const review = await prisma.review.findUnique({
    where: { id: params.reviewId },
  });
  if (!review || review.projectId !== params.projectId)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const { decision, note } = parsed.data;

    const [approval] = await prisma.$transaction([
      prisma.approval.create({
        data: {
          reviewId: review.id,
          actorId: session.user.id,
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
    console.error("[POST /api/.../approve]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
