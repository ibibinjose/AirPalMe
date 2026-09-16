// Real-device screenshots for store listings. Run on a machine that can serve
// the app and launch a browser (blocked in locked-down sandboxes):
//   npm run dev &  |  npx playwright install chromium  |  node scripts/capture-store-shots.mjs
// Captures routes at exact store sizes into store/screenshots/real/.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const OUT = "store/screenshots/real";
const BASE = process.env.STORE_BASE_URL || "http://localhost:3000";
const SIZES = [
  { dir: "ios-6.9", w: 1320, h: 2868 },
  { dir: "ios-6.7", w: 1290, h: 2796 },
  { dir: "ios-5.5", w: 1242, h: 2208 },
  { dir: "android-phone", w: 1080, h: 1920 },
];
const ROUTES = [
  ["01-scan", "/scan"],
  ["02-discover", "/"],
  ["03-concierge", "/concierge"],
  ["04-events", "/calendar"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const size of SIZES) {
  mkdirSync(`${OUT}/${size.dir}`, { recursive: true });
  const page = await browser.newContext({ viewport: { width: size.w, height: size.h } }).then((c) => c.newPage());
  for (const [name, route] of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/${size.dir}/${name}.png` });
    console.log("captured", size.dir, name);
  }
  await page.close();
}
await browser.close();
