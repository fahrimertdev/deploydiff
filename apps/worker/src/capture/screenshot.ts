import type { Browser } from "playwright";
import { stabilizePage } from "./stabilize.js";

export interface ScreenshotOptions {
  browser: Browser;
  url: string;
  viewport: { width: number; height: number };
  ignoreRules: string[];
  authCookies?: string | null;
}

type CookieParam = { name: string; value: string; url: string };

/**
 * Parses a raw Cookie header string (e.g. "name1=val1; name2=val2")
 * into Playwright cookie params using the `url` field so Chrome handles
 * __Host- and __Secure- prefix constraints automatically.
 */
function parseCookieHeader(raw: string, url: string): CookieParam[] {
  const origin = new URL(url).origin;

  // Strip "Cookie:" or "Cookie\n\t" header prefix if user copied the header name too
  const cleaned = raw.replace(/^Cookie\s*:?\s*/i, "").trim();

  return cleaned
    .split(";")
    .map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return null;
      // Remove all whitespace (including newlines/tabs) from name
      const name = part.slice(0, eqIdx).replace(/\s/g, "");
      const value = part.slice(eqIdx + 1).trim();
      if (!name) return null;
      return { name, value, url: origin };
    })
    .filter((c): c is CookieParam => c !== null);
}

export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<Buffer> {
  const { browser, url, viewport, ignoreRules, authCookies } = options;

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });

  if (authCookies) {
    const cookies = parseCookieHeader(authCookies, url);
    for (const cookie of cookies) {
      try {
        await context.addCookies([cookie]);
      } catch {
        // Invalid cookie (e.g. __Host- prefix constraint) — skip and continue
      }
    }
  }

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "load",
      timeout: 60_000,
    });

    await stabilizePage(page, ignoreRules);

    // Additional settle time for any remaining DOM mutations
    await page.waitForTimeout(800);

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    return buffer;
  } finally {
    await context.close();
  }
}
