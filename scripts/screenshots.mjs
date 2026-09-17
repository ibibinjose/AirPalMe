/**
 * Store screenshots, run on your Mac (needs a browser):
 *   npm run build && npx playwright install chromium && npm run screenshots
 * Serves dist/, captures phone screenshots into docs/store/images/screenshots/.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const SHOTS = [
  { route: "/start", name: "01-start" },
  { route: "/giveaways", name: "02-giveaways" },
  { route: "/promotions", name: "03-promotions" },
  { route: "/", name: "04-discover" },
  { route: "/getAirPal", name: "05-getairpal" },
];
const SIZES = [
  { w: 1080, h: 1920, suffix: "1080x1920" },
  { w: 1290, h: 2796, suffix: "1290x2796" },
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
  await browser.close();
  console.log("done: docs/store/images/screenshots/");
} finally {
  preview.kill();
}
