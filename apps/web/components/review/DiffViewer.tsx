"use client";

import { useState } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import type { ReviewPage, Route } from "@prisma/client";
import { cn } from "@/lib/utils";

type ReviewPageWithRoute = ReviewPage & { route: Route };

type ViewMode = "slider" | "side-by-side" | "diff";

interface DiffViewerProps {
  page: ReviewPageWithRoute;
}

export function DiffViewer({ page }: DiffViewerProps) {
  const [mode, setMode] = useState<ViewMode>("slider");

  if (page.changeStatus === "unknown") {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Screenshots are being captured...
        </p>
      </div>
    );
  }

  if (page.changeStatus === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-red-700">Capture failed</p>
        {page.captureError && (
          <p className="text-xs text-red-600 mt-2 font-mono break-all">
            {page.captureError}
          </p>
        )}
      </div>
    );
  }

  if (!page.beforeImageUrl || !page.afterImageUrl) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Screenshots not yet available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <p className="text-sm font-medium text-gray-700">
          {page.route.label}{" "}
          <span className="text-muted-foreground font-normal">
            {page.route.path}
          </span>
        </p>
        <div className="flex items-center bg-white rounded border overflow-hidden text-xs">
          {(["slider", "side-by-side", "diff"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-2.5 py-1 capitalize transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {m === "side-by-side" ? "Split" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Viewer */}
      <div className="overflow-auto bg-gray-100" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {(() => {
          const vp = page.viewportLabel;
          const maxW = vp === "mobile" ? 375 : vp === "tablet" ? 768 : undefined;
          const wrapStyle = maxW
            ? { maxWidth: maxW, margin: "0 auto", background: "#fff" }
            : undefined;

          if (mode === "slider") return (
            <div style={wrapStyle}>
              <ReactCompareSlider
                style={{ width: "100%" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={page.beforeImageUrl}
                    alt="Before"
                    style={{ objectFit: "contain", objectPosition: "top", background: "#f9fafb" }}
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={page.afterImageUrl}
                    alt="After"
                    style={{ objectFit: "contain", objectPosition: "top", background: "#f9fafb" }}
                  />
                }
              />
            </div>
          );

          if (mode === "side-by-side") return (
            <div className="grid grid-cols-2 divide-x" style={wrapStyle}>
              <div>
                <p className="text-xs text-center py-1 bg-gray-50 text-muted-foreground border-b">
                  Before (production)
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.beforeImageUrl} alt="Before" className="w-full" />
              </div>
              <div>
                <p className="text-xs text-center py-1 bg-gray-50 text-muted-foreground border-b">
                  After (preview)
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.afterImageUrl} alt="After" className="w-full" />
              </div>
            </div>
          );

          if (mode === "diff" && page.diffImageUrl) return (
            <div style={wrapStyle}>
              <p className="text-xs text-center py-1 bg-gray-50 text-muted-foreground border-b">
                Diff overlay — highlighted pixels changed
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.diffImageUrl} alt="Diff" className="w-full" />
            </div>
          );

          return null;
        })()}

        {mode === "diff" && !page.diffImageUrl && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Diff image not available.
          </div>
        )}
      </div>
    </div>
  );
}
