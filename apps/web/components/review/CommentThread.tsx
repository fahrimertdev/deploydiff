"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  createdAt: string | Date;
  authorId?: string | null;
  guestName?: string | null;
  author?: { name?: string | null; email?: string | null } | null;
}

interface CommentThreadProps {
  reviewId: string;
  projectId?: string;
  shareToken?: string;
  comments: Comment[];
  reviewPageId?: string;
  isGuest: boolean;
}

export function CommentThread({
  reviewId,
  projectId,
  shareToken,
  comments: initialComments,
  reviewPageId,
  isGuest,
}: CommentThreadProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authorName = (comment: Comment): string => {
    if (comment.guestName) return comment.guestName;
    if (comment.author?.name) return comment.author.name;
    if (comment.author?.email) return comment.author.email;
    return "Unknown";
  };

  async function submit() {
    if (!body.trim()) return;
    if (isGuest && !guestName.trim()) return;
    setSubmitting(true);

    try {
      const url = isGuest
        ? `/api/share/${shareToken}/comments`
        : `/api/projects/${projectId}/reviews/${reviewId}/comments`;

      const payload = isGuest
        ? { guestName, body, reviewPageId }
        : { body, reviewPageId };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, { ...data.comment, createdAt: new Date().toISOString() }]);
        setBody("");
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4" />
        Comments ({comments.length})
      </h3>

      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-800">
                  {authorName(comment)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {isGuest && (
          <input
            type="text"
            placeholder="Your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}
        <div className="flex gap-2">
          <textarea
            rows={2}
            placeholder="Add a comment..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={submit}
            disabled={submitting || !body.trim() || (isGuest && !guestName.trim())}
            className="self-end p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
