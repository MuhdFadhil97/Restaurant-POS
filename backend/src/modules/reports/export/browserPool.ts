import { existsSync } from "fs";
import type { Browser } from "puppeteer-core";

// puppeteer-core ships no browser binary — it must be told where Chrome/Edge
// lives. PUPPETEER_EXECUTABLE_PATH wins if set (the expected setup in a
// deployment image); otherwise fall back to the well-known install paths for
// each OS so local dev works without extra configuration.
function resolveChromePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome/Edge install found for PDF export. Set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium/Edge binary."
    );
  }
  return found;
}

let browserPromise: Promise<Browser> | null = null;

// Launched lazily on first PDF export and reused across requests — avoids
// paying Chromium's ~1-2s cold start on every export.
export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const puppeteer = await import("puppeteer-core");
    browserPromise = puppeteer.launch({
      executablePath: resolveChromePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
