import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const problems = [];

function must(ok, message) {
  if (!ok) problems.push(message);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

// Crawlable files exist and agree with each other.
must(existsSync(resolve(root, "public/robots.txt")), "public/robots.txt missing");
must(existsSync(resolve(root, "public/sitemap.xml")), "public/sitemap.xml missing");
must(existsSync(resolve(root, "public/llms.txt")), "public/llms.txt missing");
must(existsSync(resolve(root, "public/.well-known/security.txt")), "public/.well-known/security.txt missing");

const robots = read("public/robots.txt");
must(robots.includes("Sitemap: https://airpal.me/sitemap.xml"), "robots.txt must point at the sitemap");
must(robots.includes("User-agent: GPTBot"), "robots.txt must welcome AI crawlers");
must(robots.includes("Disallow: /admin"), "robots.txt must keep admin out of indexes");
must(robots.includes("Disallow: /g/"), "robots.txt must keep private stay sessions out of indexes");
must(robots.includes("Disallow: /invite/"), "robots.txt must keep invites out of indexes");

const sitemap = read("public/sitemap.xml");
must(sitemap.includes("<urlset"), "sitemap.xml must be a urlset");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
must(locs.length >= 10, `sitemap.xml must list public routes (found ${locs.length})`);
must(locs.includes("https://airpal.me/"), "sitemap.xml must list the homepage");
must(locs.includes("https://airpal.me/getAirPal"), "sitemap.xml must list the app page");
must(
  locs.every((l) => l.startsWith("https://airpal.me/")),
  "sitemap.xml locs must be absolute airpal.me URLs",
);
must(!locs.some((l) => /\/:|\*|\(/.test(l)), "sitemap.xml must not contain param routes");

const llms = read("public/llms.txt");
must(llms.includes("AirPal.Me"), "llms.txt must name the brand");
must(llms.includes("https://airpal.me/contact"), "llms.txt must give AI a contact path");

const security = read("public/.well-known/security.txt");
must(/^Contact: /m.test(security), "security.txt must declare a Contact");
must(/^Expires: \d{4}-\d{2}-\d{2}T/m.test(security), "security.txt must declare an Expires date");

// Head tags: canonical, crawler hints, and structured data.
const head = read("index.html");
must(head.includes('rel="canonical" href="https://airpal.me/"'), "index.html must declare a canonical URL");
must(head.includes('name="robots"'), "index.html must carry a robots meta");
must(head.includes('"@type": "WebSite"'), "index.html must include WebSite JSON-LD");
must(head.includes('"@type": "Organization"'), "index.html must include Organization JSON-LD");
must(head.includes("og-share-preview.jpg"), "index.html must keep the share image");

// Per-route canonicals follow client-side navigation.
must(read("src/lib/share-meta.ts").includes('rel="canonical"'), "share-meta must update the canonical link");

// Hosting serves the SEO files with the right policy.
const hosting = JSON.parse(read("firebase.json")).hosting;
const sources = (hosting.headers || []).map((h) => h.source);
for (const s of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/.well-known/security.txt"]) {
  must(sources.includes(s), `firebase.json must set headers for ${s}`);
}

if (problems.length) {
  console.error("SEO check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`SEO check passed (${locs.length} sitemap routes).`);
