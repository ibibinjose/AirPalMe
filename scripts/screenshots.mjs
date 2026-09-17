/**
 * Store screenshots, run on your Mac (needs a browser):
 *   npm run build && npx playwright install chromium && npm run screenshots
 * Serves dist/, captures phone screenshots into docs/store/images/screenshots/.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const SHOTS = [
  { route: "/start", name: "01-start" },
  { route: "/", name: "02-discover" },
  { route: "/plan", name: "03-plan" },
  { route: "/experiences", name: "04-experiences" },
  { route: "/solutions", name: "05-solutions" },
  { route: "/giveaways", name: "06-giveaways" },
  { route: "/promotions", name: "07-promotions" },
  { route: "/getAirPal", name: "08-getairpal" },
];
const SIZES = [
  // Phones: Play + App Store 6.7".
  { w: 1080, h: 1920, suffix: "1080x1920" },
  { w: 1290, h: 2796, suffix: "1290x2796" },
  // App Store required families: 6.9" and 6.5" displays.
  { w: 1320, h: 2868, suffix: "1320x2868" },
  { w: 1242, h: 2688, suffix: "1242x2688" },
  // Tablets: iPad 13" portrait + Play tablet landscape.
  { w: 2064, h: 2752, suffix: "2064x2752" },
  { w: 1920, h: 1200, suffix: "1920x1200" },
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
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
    for (const shot of SHOTS) {
      await page.goto(`http://127.0.0.1:4173${shot.route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `docs/store/images/screenshots/${shot.name}-${size.suffix}.png` });
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
