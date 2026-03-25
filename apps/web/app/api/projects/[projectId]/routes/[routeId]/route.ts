import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getRouteOrFail(routeId: string, projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) return null;

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route || route.projectId !== projectId) return null;

  return route;
}

const updateRouteSchema = z.object({
  path: z.string().min(1).max(200).optional(),
  label: z.string().min(1).max(100).optional(),
  ignoreRules: z.array(z.string()).optional(),
  viewportConfig: z
    .object({ width: z.number().int().positive(), height: z.number().int().positive() })
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; routeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const route = await getRouteOrFail(params.routeId, params.projectId, session.user.id);
  if (!route)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = updateRouteSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const updated = await prisma.route.update({
      where: { id: route.id },
      data: parsed.data,
    });

    return NextResponse.json({ route: updated });
  } catch (error) {
    console.error("[PATCH /api/projects/:id/routes/:routeId]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; routeId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const route = await getRouteOrFail(params.routeId, params.projectId, session.user.id);
  if (!route)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.route.delete({ where: { id: route.id } });

  return NextResponse.json({ success: true });
}
