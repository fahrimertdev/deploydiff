import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@deploydiff/db";

const approvalConfig: Record<
  ApprovalStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending approval",
    className: "bg-yellow-50 text-yellow-700",
  },
  approved: { label: "Approved", className: "bg-green-50 text-green-700" },
  needs_changes: {
    label: "Needs changes",
    className: "bg-red-50 text-red-700",
  },
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const config = approvalConfig[status];
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
