import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getProjectOrFail(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) return null;
  return project;
}

const createRouteSchema = z.object({
  path: z.string().min(1).max(200),
  label: z.string().min(1).max(100),
  viewportConfig: z
    .object({ width: z.number().int().positive(), height: z.number().int().positive() })
    .optional(),
  ignoreRules: z.array(z.string()).optional(),
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

  const routes = await prisma.route.findMany({
    where: { projectId: project.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ routes });
}

export async function POST(
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
    const parsed = createRouteSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 }
      );

    const { path, label, viewportConfig, ignoreRules } = parsed.data;

    // Get current max sort order
    const maxRoute = await prisma.route.findFirst({
      where: { projectId: project.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const route = await prisma.route.create({
      data: {
        projectId: project.id,
        path,
        label,
        viewportConfig: viewportConfig ?? { width: 1280, height: 800 },
        ignoreRules: ignoreRules ?? [],
        sortOrder: (maxRoute?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error: unknown) {
    // Unique constraint violation (duplicate path)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A route with this path already exists." },
        { status: 409 }
      );
    }
    console.error("[POST /api/projects/:id/routes]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
