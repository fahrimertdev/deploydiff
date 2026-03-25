import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ReviewStatusBadge } from "@/components/review/ReviewStatusBadge";
import { ApprovalBadge } from "@/components/review/ApprovalBadge";
import { ReviewPageList } from "@/components/review/ReviewPageList";
import { ApprovalBar } from "@/components/review/ApprovalBar";
import { CommentThread } from "@/components/review/CommentThread";
import { CopyShareLink } from "@/components/review/CopyShareLink";
import { ReviewPoller } from "@/components/review/ReviewPoller";

export default async function ReviewDetailPage({
  params,
}: {
  params: { projectId: string; reviewId: string };
}) {
  const session = await auth();
  const userId = session!.user!.id!;

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });
  if (!project || project.ownerId !== userId) notFound();

  const review = await prisma.review.findUnique({
    where: { id: params.reviewId },
    include: {
      pages: {
        include: { route: true },
        orderBy: { route: { sortOrder: "asc" } },
      },
      comments: {
        include: {
          author: { select: { name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!review || review.projectId !== project.id) notFound();

  const shareUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/review/${review.shareToken}`;
  const isProcessing =
    review.status === "pending" || review.status === "capturing" || review.status === "diffing";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {project.name}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ReviewStatusBadge status={review.status} />
            <ApprovalBadge status={review.approvalStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(review.createdAt)}
          </p>
          <a
            href={review.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
          >
            {review.previewUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
          {review.sourceRef && (
            <p className="text-xs text-muted-foreground mt-1">
              Ref: <code className="bg-muted px-1 py-0.5 rounded">{review.sourceRef}</code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CopyShareLink url={shareUrl} />
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Open share view
          </a>
        </div>
      </div>

      {/* Auto-poll while processing */}
      {isProcessing && (
        <ReviewPoller
          reviewId={review.id}
          projectId={project.id}
          currentStatus={review.status}
        />
      )}

      {review.status === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-medium text-red-700">
            Review generation failed.
          </p>
          <p className="text-xs text-red-600 mt-1">
            Check your production and preview URLs are accessible, then create a new review.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Page list */}
        <div className="col-span-2">
          <ReviewPageList pages={review.pages} />
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-4">
          {/* Approval */}
          {review.status === "ready" && (
            <ApprovalBar
              reviewId={review.id}
              projectId={project.id}
              currentStatus={review.approvalStatus}
              approvals={review.approvals}
            />
          )}

          {/* Comments */}
          <CommentThread
            reviewId={review.id}
            projectId={project.id}
            comments={review.comments.filter((c) => !c.reviewPageId)}
            isGuest={false}
          />
        </div>
      </div>
    </div>
  );
}
