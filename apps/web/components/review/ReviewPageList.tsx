"use client";

import { useState } from "react";
import { cn, severityColor, severityLabel } from "@/lib/utils";
import { DiffViewer } from "./DiffViewer";
import type { ReviewPage, Route } from "@prisma/client";

type ReviewPageWithRoute = ReviewPage & { route: Route };

interface ReviewPageListProps {
  pages: ReviewPageWithRoute[];
}

export function ReviewPageList({ pages }: ReviewPageListProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    pages.find((p) => p.changeStatus === "changed")?.id ?? pages[0]?.id ?? null
  );

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">
        Pages ({pages.length})
      </h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: "180px 1fr" }}>
        {/* Page list */}
        <div className="space-y-1.5">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2.5 transition-all",
                selectedPageId === page.id
                  ? "border-primary bg-primary/5"
                  : "bg-white hover:border-gray-300"
              )}
            >
              <p className="text-sm font-medium text-gray-800 truncate">
                {page.route.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {page.route.path}
              </p>
              {page.changeStatus !== "unknown" && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1",
                    severityColor(page.severity)
                  )}
                >
                  {page.changeStatus === "error"
                    ? "Capture error"
                    : severityLabel(page.severity)}
                </span>
              )}
              {page.changeStatus === "unknown" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 bg-gray-100 text-gray-500">
                  Processing...
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Diff viewer */}
        <div className="min-w-0">
          {selectedPage ? (
            <DiffViewer page={selectedPage} />
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-sm text-muted-foreground">
              Select a page to view the diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
