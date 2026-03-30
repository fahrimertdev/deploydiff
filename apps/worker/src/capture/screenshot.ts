import type { Browser } from "playwright";
import { stabilizePage } from "./stabilize.js";

export interface ScreenshotOptions {
  browser: Browser;
  url: string;
  viewport: { width: number; height: number };
  ignoreRules: string[];
}

export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<Buffer> {
  const { browser, url, viewport, ignoreRules } = options;

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    // Bypass common auth checks / CSP issues in screenshots
    ignoreHTTPSErrors: true,
  });

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
