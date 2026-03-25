import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@deploydiff/db";

const statusConfig: Record<
  ReviewStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  capturing: {
    label: "Capturing",
    className: "bg-blue-50 text-blue-600",
  },
  diffing: {
    label: "Diffing",
    className: "bg-purple-50 text-purple-600",
  },
  ready: { label: "Ready", className: "bg-green-50 text-green-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-600" },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
