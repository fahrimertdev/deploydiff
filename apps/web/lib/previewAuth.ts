/**
 * Checks whether a given previewUrl is authorized for a project.
 *
 * A preview URL is considered authorized when its hostname:
 * 1. Matches the production URL's registrable domain (same eTLD+1), OR
 * 2. Matches one of the project's allowedPreviewHosts patterns.
 *
 * Allowed host patterns support a single leading wildcard, e.g. "*.vercel.app".
 */

/** Extract the registrable domain (eTLD+1) from a hostname. */
function registrableDomain(hostname: string): string {
  // Simple heuristic: last two labels. Handles most cases (e.g. vercel.app, example.com).
  // For country-code TLDs with two levels (e.g. co.uk) this will be slightly off,
  // but is acceptable for MVP — a full PSL lookup adds significant complexity.
  const parts = hostname.toLowerCase().split(".");
  return parts.slice(-2).join(".");
}

function matchesPattern(hostname: string, pattern: string): boolean {
  const h = hostname.toLowerCase();
  const p = pattern.toLowerCase().trim();

  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return h === p.slice(2) || h.endsWith(suffix);
  }
  return h === p;
}

export class PreviewAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewAuthError";
  }
}

/**
 * Throws `PreviewAuthError` if `previewUrl` is not authorized for the project.
 *
 * @param previewUrl      - The submitted preview URL
 * @param productionUrl   - The project's configured production URL
 * @param allowedHosts    - The project's `allowedPreviewHosts` JSON array
 */
export function assertPreviewAuthorized(
  previewUrl: string,
  productionUrl: string,
  allowedHosts: unknown
): void {
  const previewHostname = new URL(previewUrl).hostname.toLowerCase();
  const productionHostname = new URL(productionUrl).hostname.toLowerCase();

  // Rule 1: same registrable domain as production
  if (registrableDomain(previewHostname) === registrableDomain(productionHostname)) {
    return;
  }

  // Rule 2: exact match or wildcard match against allowedPreviewHosts
  const patterns = Array.isArray(allowedHosts)
    ? (allowedHosts as unknown[]).filter((h): h is string => typeof h === "string")
    : [];

  for (const pattern of patterns) {
    if (matchesPattern(previewHostname, pattern)) return;
  }

  throw new PreviewAuthError(
    `Preview URL host "${previewHostname}" is not authorized for this project. ` +
    `Add it to the allowed preview hosts in project settings.`
  );
}
