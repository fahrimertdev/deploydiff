/**
 * Checks whether a given previewUrl is authorized for a project.
 *
 * A preview URL is considered authorized when its hostname:
 * 1. Matches the production URL's registrable domain (same eTLD+1), OR
 * 2. Matches one of the project's allowedPreviewHosts patterns.
 *
 * Allowed host patterns support a single leading wildcard, e.g. "*.vercel.app".
 */

/**
 * Multi-tenant shared hosting platforms where many different users share the
 * same parent domain. For these, the registrable domain heuristic (last 2 labels)
 * would incorrectly allow ANY tenant's subdomain as "same domain".
 * Users must explicitly add these to allowedPreviewHosts instead.
 */
const SHARED_HOSTING_DOMAINS = new Set([
  "vercel.app",
  "netlify.app",
  "github.io",
  "pages.dev",       // Cloudflare Pages
  "fly.dev",
  "railway.app",
  "render.com",
  "herokuapp.com",
  "netlify.com",
  "surge.sh",
]);

/** Extract the registrable domain (eTLD+1) from a hostname. */
function registrableDomain(hostname: string): string {
  // Simple heuristic: last two labels. Handles most cases (e.g. example.com).
  // Does NOT apply to known shared hosting platforms (see SHARED_HOSTING_DOMAINS).
  const parts = hostname.toLowerCase().split(".");
  return parts.slice(-2).join(".");
}

function matchesPattern(hostname: string, pattern: string): boolean {
  const h = hostname.toLowerCase();
  const p = pattern.toLowerCase().trim();

  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return h.endsWith(suffix); // must be a proper subdomain, not the root itself
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
  // Skipped for shared hosting platforms (vercel.app, netlify.app, etc.) where
  // every tenant gets a subdomain — matching on eTLD+1 would allow any tenant.
  const prodRD = registrableDomain(productionHostname);
  if (
    !SHARED_HOSTING_DOMAINS.has(prodRD) &&
    prodRD === registrableDomain(previewHostname)
  ) {
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
