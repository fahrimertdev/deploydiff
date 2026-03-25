import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  const review = await prisma.review.findUnique({
    where: { shareToken: params.shareToken },
    include: {
      project: { select: { name: true } },
      pages: {
        include: { route: true },
        orderBy: { route: { sortOrder: "asc" } },
      },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json({ review });
}
