"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Globe, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Route } from "@prisma/client";

interface RouteManagerProps {
  projectId: string;
  initialRoutes: Route[];
}

export function RouteManager({ projectId, initialRoutes }: RouteManagerProps) {
  const router = useRouter();
  const [routes, setRoutes] = useState(initialRoutes);
  const [showForm, setShowForm] = useState(false);
  const [newPath, setNewPath] = useState("/");
  const [newLabel, setNewLabel] = useState("");
  const [newIgnoreRule, setNewIgnoreRule] = useState("");
  const [newIgnoreRules, setNewIgnoreRules] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  async function addRoute() {
    if (!newPath || !newLabel) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, label: newLabel, ignoreRules: newIgnoreRules }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add route."); return; }

      setRoutes((prev) => [...prev, data.route]);
      setNewPath("/");
      setNewLabel("");
      setNewIgnoreRules([]);
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteRoute(routeId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/routes/${routeId}`, { method: "DELETE" });
      if (res.ok) { setRoutes((prev) => prev.filter((r) => r.id !== routeId)); router.refresh(); }
    } catch { /* ignore */ }
  }

  function addIgnoreRule() {
    const trimmed = newIgnoreRule.trim();
    if (!trimmed || newIgnoreRules.includes(trimmed)) return;
    setNewIgnoreRules((prev) => [...prev, trimmed]);
    setNewIgnoreRule("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Routes ({routes.length})</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="w-3 h-3" />
          Add route
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-3 mb-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Path</label>
            <input
              type="text" value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/pricing"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input
              type="text" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Pricing"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Ignore rules */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ignore rules{" "}
              <span className="text-muted-foreground font-normal">(CSS selectors to hide before diff)</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text" value={newIgnoreRule}
                onChange={(e) => setNewIgnoreRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIgnoreRule())}
                placeholder=".cookie-banner, #chat-widget"
                className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button" onClick={addIgnoreRule}
                className="rounded border px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {newIgnoreRules.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {newIgnoreRules.map((rule) => (
                  <span key={rule} className="inline-flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 text-xs font-mono">
                    {rule}
                    <button onClick={() => setNewIgnoreRules((p) => p.filter((r) => r !== rule))}>
                      <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addRoute}
              disabled={adding || !newPath || !newLabel}
              className="bg-primary text-primary-foreground rounded px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {routes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-6 text-center">
          <p className="text-xs text-muted-foreground">No routes yet. Add pages to compare.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {routes.map((route) => {
            const ignoreRules = route.ignoreRules as string[];
            const isExpanded = expandedRouteId === route.id;

            return (
              <div key={route.id} className="bg-white rounded-lg border">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{route.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{route.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {ignoreRules.length > 0 && (
                      <button
                        onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                        className="p-1 text-muted-foreground hover:text-gray-700 transition-colors text-xs flex items-center gap-0.5"
                        title="View ignore rules"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span className="text-xs">{ignoreRules.length}</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteRoute(route.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {isExpanded && ignoreRules.length > 0 && (
                  <div className="px-3 pb-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Ignore rules:</p>
                    <div className="flex flex-wrap gap-1">
                      {ignoreRules.map((rule) => (
                        <span key={rule} className="bg-gray-100 rounded px-2 py-0.5 text-xs font-mono text-gray-600">
                          {rule}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
