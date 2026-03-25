import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    include: {
      _count: { select: { reviews: true, routes: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { approvalStatus: true, status: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl bg-white">
          <p className="text-muted-foreground text-sm mb-4">
            No projects yet. Create your first deploy review project.
          </p>
          <Link
            href="/projects/new"
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Create project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const lastReview = project.reviews[0];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between bg-white rounded-xl border p-5 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{project.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {project.productionUrl}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project._count.routes} route
                    {project._count.routes !== 1 ? "s" : ""} &middot;{" "}
                    {project._count.reviews} review
                    {project._count.reviews !== 1 ? "s" : ""}
                  </p>
                </div>
                {lastReview && (
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-muted-foreground">
                      Last review {formatDate(lastReview.createdAt)}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
