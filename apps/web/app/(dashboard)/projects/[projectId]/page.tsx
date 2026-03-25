import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RouteManager } from "@/components/project/RouteManager";
import { CreateReviewButton } from "@/components/review/CreateReviewButton";
import { ReviewStatusBadge } from "@/components/review/ReviewStatusBadge";
import { ApprovalBadge } from "@/components/review/ApprovalBadge";

export default async function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      routes: { orderBy: { sortOrder: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          _count: { select: { pages: true, comments: true } },
        },
      },
    },
  });

  if (!project || project.ownerId !== userId) {
    notFound();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <a
            href={project.productionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
          >
            {project.productionUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/settings`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <CreateReviewButton
            projectId={project.id}
            hasRoutes={project.routes.length > 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Routes */}
        <div className="col-span-1">
          <RouteManager
            projectId={project.id}
            initialRoutes={project.routes}
          />
        </div>

        {/* Reviews */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Reviews</h2>

          {project.reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No reviews yet. Add routes and create your first review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/projects/${project.id}/reviews/${review.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ReviewStatusBadge status={review.status} />
                      <ApprovalBadge status={review.approvalStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {review.previewUrl}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {review._count.pages} page
                      {review._count.pages !== 1 ? "s" : ""} &middot;{" "}
                      {review._count.comments} comment
                      {review._count.comments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
