import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function severityColor(severity: string | null | undefined): string {
  switch (severity) {
    case "major":
      return "text-red-600 bg-red-50";
    case "significant":
      return "text-orange-600 bg-orange-50";
    case "minor":
      return "text-yellow-600 bg-yellow-50";
    case "none":
      return "text-green-600 bg-green-50";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export function severityLabel(severity: string | null | undefined): string {
  switch (severity) {
    case "major":
      return "Major change";
    case "significant":
      return "Significant change";
    case "minor":
      return "Minor change";
    case "none":
      return "No change";
    default:
      return "Unknown";
  }
}
