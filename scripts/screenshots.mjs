/**
 * Store screenshots, run on your Mac (needs a browser):
 *   npm run build && npx playwright install chromium && npm run screenshots
 * Serves dist/, captures phone screenshots into docs/store/images/screenshots/.
 *
 * Pass flavor: bake the override first, then capture to screenshots-pass/:
 *   VITE_APP_FLAVOR=pass npm run build && node scripts/screenshots.mjs --flavor=pass
 *
 * Viewports use CSS pixels × deviceScaleFactor so 1080×1920 is a phone
 * layout, not a desktop page in a tall frame. Wait for the native splash
 * overlay to unmount before shooting.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const FLAVOR = process.argv.includes("--flavor=pass") ? "pass" : "airpal";

const SHOTS = [
  { route: "/", name: "01-home" },
  { route: "/now", name: "02-now" },
  { route: "/plan", name: "03-plan" },
  { route: "/pass", name: "04-pass" },
  { route: "/calendar", name: "05-calendar" },
  { route: "/scan", name: "06-scan" },
  { route: "/getAirPalApp", name: "07-getairpal" },
];

const SHOTS_PASS = [
  { route: "/pass", name: "01-pass" },
  { route: "/events", name: "02-events" },
  { route: "/me/tickets", name: "03-tickets" },
  { route: "/deals", name: "04-deals" },
  { route: "/scan", name: "05-scan" },
];

const PLAN = FLAVOR === "pass" ? SHOTS_PASS : SHOTS;
const OUT_DIR = FLAVOR === "pass" ? "docs/store/images/screenshots-pass" : "docs/store/images/screenshots";

/** CSS size × scale = store pixel size. */
const SIZES = [
  { cssW: 360, cssH: 640, scale: 3, suffix: "1080x1920", mobile: true },
  { cssW: 430, cssH: 932, scale: 3, suffix: "1290x2796", mobile: true },
  { cssW: 440, cssH: 956, scale: 3, suffix: "1320x2868", mobile: true },
  { cssW: 414, cssH: 896, scale: 3, suffix: "1242x2688", mobile: true },
  { cssW: 1032, cssH: 1376, scale: 2, suffix: "2064x2752", mobile: false },
  { cssW: 960, cssH: 600, scale: 2, suffix: "1920x1200", mobile: false },
];

function waitForServer(port, tries = 40) {
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(`http://127.0.0.1:${port}/`)
        .then((r) => (r.ok ? resolve(true) : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (--tries <= 0) return reject(new Error("preview server never came up"));
      setTimeout(tick, 500);
    };
    tick();
  });
}

const preview = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
try {
  await waitForServer(4173);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size.cssW, height: size.cssH },
      deviceScaleFactor: size.scale,
      isMobile: size.mobile,
      hasTouch: true,
    });
    for (const shot of PLAN) {
      await page.addInitScript(() => {
        try {
          globalThis.localStorage.setItem(
            "airpal.location.v1",
            JSON.stringify({ mode: "city", city: "Sydney", lat: -33.8688, lng: 151.2093 }),
          );
        } catch {
          /* ignore */
        }
      });
      await page.goto(`http://127.0.0.1:4173${shot.route}`, { waitUntil: "domcontentloaded" });
      await page.addStyleTag({
        content: 'footer[role="contentinfo"]{display:none!important}',
      });
      await page
        .locator("#native-splash-transition")
        .waitFor({ state: "detached", timeout: 8000 })
        .catch(() => {});
      await page.locator("#main-content").waitFor({ state: "attached", timeout: 15000 });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `${OUT_DIR}/${shot.name}-${size.suffix}.png`,
        fullPage: false,
      });
      console.log("captured", shot.name, size.suffix);
    }
    await page.close();
  }
  await browser.close();
  console.log(`done: ${OUT_DIR}/`);
} finally {
  preview.kill();
}
