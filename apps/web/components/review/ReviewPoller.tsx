"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@deploydiff/db";

interface ReviewPollerProps {
  reviewId: string;
  projectId: string;
  currentStatus: ReviewStatus;
}

export function ReviewPoller({
  reviewId,
  projectId,
  currentStatus,
}: ReviewPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (currentStatus === "ready" || currentStatus === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/reviews/${reviewId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const status: ReviewStatus = data.review?.status;

        if (status === "ready" || status === "failed") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [reviewId, projectId, currentStatus, router]);

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6">
      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-blue-800">
          {currentStatus === "pending" && "Review queued — waiting to start..."}
          {currentStatus === "capturing" && "Capturing screenshots..."}
          {currentStatus === "diffing" && "Generating diffs..."}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          This page will update automatically.
        </p>
      </div>
    </div>
  );
}
