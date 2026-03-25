import type { Page } from "playwright";

// CSS injected before every screenshot to freeze animations and hide dynamic elements
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  video, iframe[src*="youtube"], iframe[src*="vimeo"] {
    visibility: hidden !important;
  }
`;

// Common cookie banner selectors — best-effort click to dismiss
const COOKIE_BANNER_SELECTORS = [
  '[id*="cookie"] button[class*="accept"]',
  '[class*="cookie"] button[class*="accept"]',
  '[id*="consent"] button[class*="agree"]',
  'button[data-testid="cookie-accept"]',
];

export async function stabilizePage(
  page: Page,
  ignoreRules: string[]
): Promise<void> {
  // 1. Inject freeze CSS
  await page.addStyleTag({ content: FREEZE_CSS });

  // 2. Block video/media requests
  await page.route(/\.(mp4|webm|ogg|flv)(\?.*)?$/, (route) => route.abort());

  // 3. Best-effort cookie banner dismissal
  for (const selector of COOKIE_BANNER_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 500 })) {
        await el.click({ timeout: 500 });
        break;
      }
    } catch {
      // not found — continue
    }
  }

  // 4. Hide ignore-rule selectors (dynamic regions the user has marked to mask)
  if (ignoreRules.length > 0) {
    const maskCss = ignoreRules
      .map((selector) => `${selector} { visibility: hidden !important; }`)
      .join("\n");
    await page.addStyleTag({ content: maskCss });
  }
}
