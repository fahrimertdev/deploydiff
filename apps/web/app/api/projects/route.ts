import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUrl, UrlValidationError } from "@/lib/validateUrl";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  productionUrl: z.string().url(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { reviews: true, routes: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, productionUrl } = parsed.data;

    try {
      await validateUrl(productionUrl);
    } catch (err) {
      if (err instanceof UrlValidationError)
        return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    const project = await prisma.project.create({
      data: {
        name,
        productionUrl,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
