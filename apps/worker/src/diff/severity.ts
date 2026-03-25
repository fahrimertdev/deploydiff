export type Severity = "none" | "minor" | "significant" | "major";

export function computeSeverity(diffScore: number): Severity {
  if (diffScore === 0) return "none";
  if (diffScore < 0.01) return "minor";
  if (diffScore < 0.05) return "significant";
  return "major";
}
