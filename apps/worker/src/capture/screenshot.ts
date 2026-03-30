import type { Browser, Cookie } from "playwright";
import { stabilizePage } from "./stabilize.js";

export interface ScreenshotOptions {
  browser: Browser;
  url: string;
  viewport: { width: number; height: number };
  ignoreRules: string[];
  authCookies?: string | null;
}

/**
 * Parses a raw Cookie header string (e.g. "name1=val1; name2=val2")
 * into Playwright Cookie objects scoped to the given URL's hostname.
 */
function parseCookieHeader(raw: string, url: string): Cookie[] {
  const hostname = new URL(url).hostname;
  return raw
    .split(";")
    .map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return null;
      const name = part.slice(0, eqIdx).trim();
      const value = part.slice(eqIdx + 1).trim();
      if (!name) return null;
      return { name, value, domain: hostname, path: "/" } as Cookie;
    })
    .filter((c): c is Cookie => c !== null);
}

export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<Buffer> {
  const { browser, url, viewport, ignoreRules, authCookies } = options;

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    // Bypass common auth checks / CSP issues in screenshots
    ignoreHTTPSErrors: true,
  });

  if (authCookies) {
    const cookies = parseCookieHeader(authCookies, url);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
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
