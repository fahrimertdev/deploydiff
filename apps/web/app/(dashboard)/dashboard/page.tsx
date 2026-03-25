import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    include: {
      _count: { select: { reviews: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, createdAt: true, approvalStatus: true, status: true },
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
            Manage your deploy review projects
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
        <div className="text-center py-20 border border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm mb-4">
            No projects yet. Create your first project to get started.
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
                className="block bg-white rounded-xl border p-5 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {project.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-xs">
                      {project.productionUrl}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {project._count.reviews} review
                      {project._count.reviews !== 1 ? "s" : ""}
                    </span>
                    {lastReview && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last: {formatDate(lastReview.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
