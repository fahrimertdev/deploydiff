"use client";

import { useState } from "react";
import { cn, severityColor, severityLabel } from "@/lib/utils";
import { DiffViewer } from "./DiffViewer";
import type { ReviewPage, Route } from "@prisma/client";
import { Monitor, Tablet, Smartphone } from "lucide-react";

type ReviewPageWithRoute = ReviewPage & { route: Route };

const VIEWPORT_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="w-3.5 h-3.5" />,
  tablet:  <Tablet  className="w-3.5 h-3.5" />,
  mobile:  <Smartphone className="w-3.5 h-3.5" />,
};

interface ReviewPageListProps {
  pages: ReviewPageWithRoute[];
}

export function ReviewPageList({ pages }: ReviewPageListProps) {
  // Group pages by routeId
  const routes = Array.from(
    pages.reduce((map, p) => {
      if (!map.has(p.routeId)) map.set(p.routeId, { route: p.route, pages: [] });
      map.get(p.routeId)!.pages.push(p);
      return map;
    }, new Map<string, { route: Route; pages: ReviewPageWithRoute[] }>())
  ).map(([, v]) => v);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    routes.find((r) => r.pages.some((p) => p.changeStatus === "changed"))?.route.id ??
    routes[0]?.route.id ?? ""
  );

  const selectedGroup = routes.find((r) => r.route.id === selectedRouteId);
  const viewports = selectedGroup?.pages.map((p) => p.viewportLabel) ?? [];

  const [selectedViewport, setSelectedViewport] = useState<string>(viewports[0] ?? "desktop");

  const selectedPage = selectedGroup?.pages.find((p) => p.viewportLabel === selectedViewport)
    ?? selectedGroup?.pages[0];

  function selectRoute(routeId: string) {
    setSelectedRouteId(routeId);
    const group = routes.find((r) => r.route.id === routeId);
    setSelectedViewport(group?.pages[0]?.viewportLabel ?? "desktop");
  }

  // Worst severity per route for badge
  function worstSeverity(routePages: ReviewPageWithRoute[]) {
    const order = ["major", "significant", "minor", "none", null];
    for (const sev of order) {
      if (routePages.some((p) => p.severity === sev)) return sev;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Pages ({routes.length})</h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: "180px 1fr" }}>
        {/* Route list */}
        <div className="space-y-1.5">
          {routes.map(({ route, pages: rPages }) => {
            const hasError    = rPages.some((p) => p.changeStatus === "error");
            const allUnknown  = rPages.every((p) => p.changeStatus === "unknown");
            const sev         = worstSeverity(rPages);

            return (
              <button
                key={route.id}
                onClick={() => selectRoute(route.id)}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2.5 transition-all",
                  selectedRouteId === route.id
                    ? "border-primary bg-primary/5"
                    : "bg-white hover:border-gray-300"
                )}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{route.label}</p>
                <p className="text-xs text-muted-foreground truncate">{route.path}</p>
                {allUnknown ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 bg-gray-100 text-gray-500">
                    Processing...
                  </span>
                ) : hasError ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 bg-red-100 text-red-600">
                    Capture error
                  </span>
                ) : (
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1", severityColor(sev))}>
                    {severityLabel(sev)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Diff viewer */}
        <div className="min-w-0">
          {selectedGroup && viewports.length > 1 && (
            <div className="flex items-center gap-1 mb-2">
              {viewports.map((vp) => (
                <button
                  key={vp}
                  onClick={() => setSelectedViewport(vp)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize",
                    selectedViewport === vp
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {VIEWPORT_ICONS[vp]}
                  {vp}
                </button>
              ))}
            </div>
          )}
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
