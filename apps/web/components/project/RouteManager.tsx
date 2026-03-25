"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Globe } from "lucide-react";
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
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addRoute() {
    if (!newPath || !newLabel) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, label: newLabel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add route.");
        return;
      }

      setRoutes((prev) => [...prev, data.route]);
      setNewPath("/");
      setNewLabel("");
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
      const res = await fetch(
        `/api/projects/${projectId}/routes/${routeId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setRoutes((prev) => prev.filter((r) => r.id !== routeId));
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Routes ({routes.length})
        </h2>
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
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Path
            </label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/pricing"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Label
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Pricing"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
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
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {routes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No routes yet. Add pages to compare.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {routes.map((route) => (
            <div
              key={route.id}
              className="flex items-center justify-between bg-white rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {route.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {route.path}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteRoute(route.id)}
                className="ml-2 p-1 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
