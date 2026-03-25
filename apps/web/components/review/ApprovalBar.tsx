"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import type { ApprovalStatus } from "@deploydiff/db";
import { formatDate } from "@/lib/utils";

interface Approval {
  id: string;
  decision: string;
  guestName?: string | null;
  note?: string | null;
  createdAt: Date | string;
  actor?: { name?: string | null; email?: string | null } | null;
}

interface ApprovalBarProps {
  reviewId: string;
  projectId: string;
  shareToken?: string;
  currentStatus: ApprovalStatus;
  approvals: Approval[];
  isGuest?: boolean;
}

export function ApprovalBar({
  reviewId,
  projectId,
  shareToken,
  currentStatus,
  approvals,
  isGuest = false,
}: ApprovalBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "needs_changes" | null>(
    null
  );
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "approved" | "needs_changes") {
    if (isGuest && !guestName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(decision);
    setError(null);

    try {
      const url = isGuest
        ? `/api/share/${shareToken}/approve`
        : `/api/projects/${projectId}/reviews/${reviewId}/approve`;

      const payload = isGuest
        ? { guestName, decision, note: note || undefined }
        : { decision, note: note || undefined };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  const actorName = (a: Approval) =>
    a.guestName ?? a.actor?.name ?? a.actor?.email ?? "Unknown";

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Approval</h3>

      {/* Current status */}
      {currentStatus === "approved" && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Approved</span>
        </div>
      )}
      {currentStatus === "needs_changes" && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Needs changes</span>
        </div>
      )}

      {/* Approval history */}
      {approvals.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {approvals.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              {a.decision === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              )}
              <span className="font-medium text-gray-700">{actorName(a)}</span>
              <span>{formatDate(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {isGuest && (
        <input
          type="text"
          placeholder="Your name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm mb-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      )}

      <textarea
        rows={2}
        placeholder="Optional note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm mb-2 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      <div className="flex gap-2">
        <button
          onClick={() => submit("approved")}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          {loading === "approved" ? "..." : "Approve"}
        </button>
        <button
          onClick={() => submit("needs_changes")}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          {loading === "needs_changes" ? "..." : "Needs changes"}
        </button>
      </div>
    </div>
  );
}
