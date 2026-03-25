"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  productionUrl: string;
}

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data.project);
        setName(data.project.name);
        setProductionUrl(data.project.productionUrl);
      });
  }, [params.projectId]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, productionUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    if (
      !confirm(
        "Are you sure you want to delete this project? All reviews and data will be lost permanently."
      )
    )
      return;

    setDeleting(true);
    try {
      await fetch(`/api/projects/${params.projectId}`, { method: "DELETE" });
      router.push("/projects");
    } catch {
      setDeleting(false);
    }
  }

  if (!project) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href={`/projects/${params.projectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to project
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Project settings
      </h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            General
          </h2>
          <form onSubmit={saveSettings} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                Settings saved.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production URL
              </label>
              <input
                type="url"
                required
                value={productionUrl}
                onChange={(e) => setProductionUrl(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">
            Danger zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this project is permanent. All reviews, comments, and
            approvals will be lost.
          </p>
          <button
            onClick={deleteProject}
            disabled={deleting}
            className="inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}
