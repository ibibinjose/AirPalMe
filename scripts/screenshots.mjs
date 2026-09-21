/**
 * Store screenshots, run on your Mac (needs a browser):
 *   npm run build && npx playwright install chromium && npm run screenshots
 * Serves dist/, captures phone screenshots into docs/store/images/screenshots/.
 *
 * Viewports use CSS pixels × deviceScaleFactor so 1080×1920 is a phone
 * layout, not a desktop page in a tall frame. Wait for the native splash
 * overlay to unmount before shooting.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const SHOTS = [
  { route: "/", name: "01-home", door: null },
  { route: "/", name: "02-discover", door: "explore" },
  { route: "/plan", name: "03-plan", door: "plan" },
  { route: "/experiences", name: "04-experiences", door: "explore" },
  { route: "/concierge", name: "05-stay", door: "stay" },
  { route: "/calendar", name: "06-calendar", door: "explore" },
  { route: "/scan", name: "07-scan", door: "stay" },
  { route: "/getAirPalApp", name: "08-getairpal", door: "explore" },
];

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
  mkdirSync("docs/store/images/screenshots", { recursive: true });
  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size.cssW, height: size.cssH },
      deviceScaleFactor: size.scale,
      isMobile: size.mobile,
      hasTouch: true,
    });
    for (const shot of SHOTS) {
      await page.addInitScript((door) => {
        try {
          const storage = globalThis.localStorage;
          if (door) storage.setItem("airpal.door.v1", door);
          else storage.removeItem("airpal.door.v1");
          storage.setItem(
            "airpal.location.v1",
            JSON.stringify({ mode: "city", city: "Sydney", lat: -33.8688, lng: 151.2093 }),
          );
        } catch {
          /* ignore */
        }
      }, shot.door);
      await page.goto(`http://127.0.0.1:4173${shot.route}`, { waitUntil: "domcontentloaded" });
      await page.addStyleTag({
        content: 'footer[role="contentinfo"]{display:none!important}',
      });
      await page.locator("#native-splash-transition").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
      await page.getByRole("button", { name: "What's on" }).waitFor({ state: "attached", timeout: 15000 });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `docs/store/images/screenshots/${shot.name}-${size.suffix}.png`,
        fullPage: false,
      });
      console.log("captured", shot.name, size.suffix);
    }
    await page.close();
  }
  // Marketing poster: exact 1080x1350 social/store creative, chrome-free.
  const poster = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await poster.goto("http://127.0.0.1:4173/marketing?bare=1", { waitUntil: "networkidle" });
  await poster.waitForTimeout(1500);
  await poster.locator(".marketing-poster").screenshot({ path: "docs/store/images/marketing-poster-1080x1350.png" });
  console.log("captured marketing poster 1080x1350");
  await poster.close();
  await browser.close();
  console.log("done: docs/store/images/screenshots/");
} finally {
  preview.kill();
}
