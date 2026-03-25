import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReviewStatusBadge } from "@/components/review/ReviewStatusBadge";
import { ApprovalBadge } from "@/components/review/ApprovalBadge";
import { ReviewPageList } from "@/components/review/ReviewPageList";
import { ApprovalBar } from "@/components/review/ApprovalBar";
import { CommentThread } from "@/components/review/CommentThread";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export default async function ShareReviewPage({
  params,
}: {
  params: { shareToken: string };
}) {
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
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!review) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              DeployDiff
            </span>
            <span className="text-sm text-muted-foreground mx-2">/</span>
            <span className="text-sm font-semibold text-gray-900">
              {review.project.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ReviewStatusBadge status={review.status} />
            <ApprovalBadge status={review.approvalStatus} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Review info */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Created {formatDate(review.createdAt)}
              </p>
              <div className="flex items-center gap-4 mt-1">
                <a
                  href={review.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  Preview
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={review.productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  Production
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Page diffs */}
          <div className="col-span-2">
            <ReviewPageList pages={review.pages} />
          </div>

          {/* Sidebar */}
          <div className="col-span-1 space-y-4">
            {review.status === "ready" && (
              <ApprovalBar
                reviewId={review.id}
                projectId=""
                shareToken={params.shareToken}
                currentStatus={review.approvalStatus}
                approvals={review.approvals}
                isGuest={true}
              />
            )}

            <CommentThread
              reviewId={review.id}
              shareToken={params.shareToken}
              comments={review.comments.filter((c) => !c.reviewPageId).map((c) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                author: c.author ?? null,
              }))}
              isGuest={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
