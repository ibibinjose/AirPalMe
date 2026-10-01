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
must(locs.includes("https://airpal.me/getAirPalApp"), "sitemap.xml must list the app page");
must(
  locs.every((l) => l.startsWith("https://airpal.me/")),
  "sitemap.xml locs must be absolute airpal.me URLs",
);
must(!locs.some((l) => /\/:|\*|\(/.test(l)), "sitemap.xml must not contain param routes");

const llms = read("public/llms.txt");
must(llms.includes("AirPal.Me"), "llms.txt must name the brand");
must(llms.includes("https://airpal.me/contact"), "llms.txt must give AI a contact path");
must(llms.includes("https://airpal.me/trust"), "llms.txt must point AI at the company-facts page");
must(llms.includes("https://airpal.me/concierge"), "llms.txt must point AI at the concierge page");
must(llms.includes("https://airpal.me/mate"), "llms.txt must point AI at the Mate page");
must(llms.includes("/alternatives/"), "llms.txt must point AI at the comparison pages");

const security = read("public/.well-known/security.txt");
must(/^Contact: /m.test(security), "security.txt must declare a Contact");
must(/^Expires: \d{4}-\d{2}-\d{2}T/m.test(security), "security.txt must declare an Expires date");

// Head tags: canonical, crawler hints, and structured data.
const head = read("index.html");
must(head.includes('rel="canonical" href="https://airpal.me/"'), "index.html must declare a canonical URL");
must(head.includes('name="robots"'), "index.html must carry a robots meta");
must(head.includes('"@type": "WebSite"'), "index.html must include WebSite JSON-LD");
must(head.includes('"@type": "Organization"'), "index.html must include Organization JSON-LD");
must(head.includes("og-share.jpg"), "index.html must keep the share image");
must(head.includes('og:image:width" content="1200"'), "index.html must size the share image");
must(locs.includes("https://airpal.me/mate"), "sitemap.xml must list the Mate page");
must(locs.includes("https://airpal.me/concierge"), "sitemap.xml must list the concierge page");
must(locs.includes("https://airpal.me/fashion"), "sitemap.xml must list the fashion page");
must(read("src/lib/share-meta.ts").includes("applyRouteMeta"), "share-meta must apply per-route titles");

// Per-route canonicals follow client-side navigation.
must(read("src/lib/share-meta.ts").includes('rel="canonical"'), "share-meta must update the canonical link");

// Hosting serves the SEO files with the right policy.
const hosting = JSON.parse(read("firebase.json")).hosting;
const sources = (hosting.headers || []).map((h) => h.source);
for (const s of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/.well-known/security.txt"]) {
  must(sources.includes(s), `firebase.json must set headers for ${s}`);
}

// Non-JS crawlers must get readable words, not an empty shell.
must(head.includes("<noscript>"), "index.html must carry a <noscript> fallback for non-JS readers");
must(head.includes("prerender:body-start"), "index.html must keep the static #root placeholder for crawlers");
must(
  (head.split("prerender:body-start")[1] || "").split("prerender:body-end")[0].includes("<div") === false,
  "index.html #root placeholder must not nest <div> (prerender script invariant)",
);
must(head.includes('href="/about"'), "index.html static body must link to public routes");
must(head.includes('href="/contact"'), "index.html static body must link to contact");
must(head.includes('"addressCountry": "AU"'), "index.html Organization JSON-LD must declare the Australian address");

// Marketing routes prerender with self-referencing canonicals at build time.
must(
  read("package.json").includes("node scripts/prerender-routes.mjs"),
  "package.json build must run the route prerender script",
);
let prerenderRoutes = [];
try {
  prerenderRoutes = JSON.parse(read("scripts/prerender-routes.json"));
  must(Array.isArray(prerenderRoutes) && prerenderRoutes.length > 0, "prerender-routes.json must list routes");
} catch {
  must(false, "prerender-routes.json must be valid JSON");
}
for (const route of prerenderRoutes) {
  const label = (route && route.path) || "?";
  must(/^\/[a-z-]+(?:\/[a-z-]+)?$/.test(label), `prerender route ${label} must be a simple public path`);
  for (const key of ["title", "description", "heading", "summary"]) {
    must(typeof route[key] === "string" && route[key].trim().length > 0, `prerender route ${label} must have ${key}`);
  }
  must(locs.includes(`https://airpal.me${label}`), `prerender route ${label} must be in the sitemap`);
  if (route.jsonLd !== undefined) {
    must(
      Array.isArray(route.jsonLd) && route.jsonLd.length > 0,
      `prerender route ${label} jsonLd must be a non-empty array`,
    );
    for (const block of route.jsonLd) {
      must(
        block && typeof block === "object" && typeof block["@type"] === "string",
        `prerender route ${label} jsonLd blocks must declare @type`,
      );
      must(
        !JSON.stringify(block).includes("</script"),
        `prerender route ${label} jsonLd must not break out of its script tag`,
      );
    }
  }
}

if (problems.length) {
  console.error("SEO check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`SEO check passed (${locs.length} sitemap routes).`);
