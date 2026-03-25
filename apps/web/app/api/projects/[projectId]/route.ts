import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getProjectOrFail(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) return null;
  return project;
}

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  productionUrl: z.string().url().optional(),
  viewportPresets: z.array(z.enum(["desktop", "tablet", "mobile"])).min(1).optional(),
  webhookSecret: z.string().max(200).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await getProjectOrFail(params.projectId, session.user.id);
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [routes, reviews] = await Promise.all([
    prisma.route.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.review.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        shareToken: true,
        previewUrl: true,
        status: true,
        approvalStatus: true,
        createdAt: true,
        _count: { select: { pages: true, comments: true } },
      },
    }),
  ]);

  return NextResponse.json({ project, routes, reviews });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await getProjectOrFail(params.projectId, session.user.id);
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: parsed.data,
    });

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error("[PATCH /api/projects/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const project = await getProjectOrFail(params.projectId, session.user.id);
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.project.delete({ where: { id: project.id } });

  return NextResponse.json({ success: true });
}
