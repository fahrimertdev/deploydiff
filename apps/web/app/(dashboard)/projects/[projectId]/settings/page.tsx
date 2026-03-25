"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Monitor, Tablet, Smartphone, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  productionUrl: string;
  viewportPresets: string[];
  webhookSecret: string | null;
}

const VIEWPORT_OPTIONS = [
  { id: "desktop", label: "Desktop", description: "1280 × 800", icon: Monitor },
  { id: "tablet",  label: "Tablet",  description: "768 × 1024", icon: Tablet },
  { id: "mobile",  label: "Mobile",  description: "375 × 812",  icon: Smartphone },
];

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const [project, setProject]             = useState<Project | null>(null);
  const [name, setName]                   = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [viewports, setViewports]         = useState<string[]>(["desktop"]);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const p: Project = data.project;
        setProject(p);
        setName(p.name);
        setProductionUrl(p.productionUrl);
        setViewports((p.viewportPresets as string[]) ?? ["desktop"]);
        setWebhookSecret(p.webhookSecret ?? "");
      });
  }, [params.projectId]);

  function toggleViewport(vp: string) {
    setViewports((prev) =>
      prev.includes(vp)
        ? prev.length > 1 ? prev.filter((v) => v !== vp) : prev // keep at least one
        : [...prev, vp]
    );
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          productionUrl,
          viewportPresets: viewports,
          webhookSecret: webhookSecret || null,
        }),
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
    if (!confirm("Are you sure you want to delete this project? All reviews and data will be lost permanently.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${params.projectId}`, { method: "DELETE" });
      router.push("/projects");
    } catch {
      setDeleting(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const webhookBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const githubWebhookUrl = `${webhookBaseUrl}/api/webhooks/github/${params.projectId}`;
  const vercelWebhookUrl = `${webhookBaseUrl}/api/webhooks/vercel/${params.projectId}`;

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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Project settings</h1>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">General</h2>
          <form onSubmit={saveSettings} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">Settings saved.</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
              <input
                type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Production URL</label>
              <input
                type="url" required value={productionUrl}
                onChange={(e) => setProductionUrl(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Viewports */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capture viewports
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Each selected viewport captures separate before/after screenshots per route.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {VIEWPORT_OPTIONS.map(({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleViewport(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors",
                      viewports.includes(id)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                    <span className="text-gray-400">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={saving}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>

        {/* Webhooks */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Webhooks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect GitHub or Vercel to automatically create a review when a PR or deployment is ready.
          </p>

          <div className="space-y-3 mb-4">
            {[
              { label: "GitHub webhook URL", url: githubWebhookUrl, key: "github" },
              { label: "Vercel webhook URL", url: vercelWebhookUrl, key: "vercel" },
            ].map(({ label, url, key }) => (
              <div key={key}>
                <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-700 truncate">
                    {url}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(url, key)}
                    className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {copied === key ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Webhook secret <span className="text-muted-foreground font-normal">(set the same value in GitHub/Vercel)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="my-secret-token"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const s = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
                  setWebhookSecret(s);
                }}
                className="rounded-lg border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Save settings after updating the secret.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={(e) => saveSettings(e as unknown as React.FormEvent)}
            className="mt-4 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save webhook settings"}
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">Danger zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this project is permanent. All reviews, comments, and approvals will be lost.
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
