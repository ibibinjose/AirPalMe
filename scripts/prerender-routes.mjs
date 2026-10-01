/**
 * Build-time prerender for public marketing routes.
 *
 * The app is a Vite SPA: every route serves the same static index.html and
 * per-route titles/descriptions/canonicals only exist after JS runs
 * (src/lib/share-meta.ts). Non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * never see them, and every URL looks like a duplicate of /.
 *
 * This script runs after `vite build`. It copies the built dist/index.html —
 * hashed assets and all — once per route in prerender-routes.json, swapping
 * the head tags (title, description, self-referencing canonical, OG/Twitter)
 * and the static pre-hydration body for route-specific copies. React wipes the
 * static body on mount, so humans with JS see the app unchanged.
 *
 * No new dependencies, no framework change, no firebase.json change:
 * Firebase Hosting serves dist/<route>/index.html as a static file, and all
 * other routes keep the existing SPA fallback. Authenticated in-app routes
 * stay client-rendered.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://airpal.me";

/** Shared crawlable nav, mirrored from the homepage placeholder in index.html. */
const NAV_LINKS = [
  ["/about", "About"],
  ["/concierge", "Stay & Guide"],
  ["/plan", "Plans"],
  ["/mate", "Find a Mate"],
  ["/experiences", "Experiences"],
  ["/calendar", "What's on"],
  ["/business", "Business"],
  ["/solutions", "Solutions"],
  ["/guide", "Guide"],
  ["/join", "Join"],
  ["/partners", "Partners"],
  ["/trust", "Trust"],
  ["/contact", "Contact"],
];

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Replace exactly once; anything else means index.html changed shape. */
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`prerender: expected exactly 1 ${label}, found ${matches ? matches.length : 0}`);
  }
  return html.replace(pattern, replacement);
}

function metaTag(property, content) {
  return `<meta property="${property}" content="${escapeHtml(content)}" />`;
}

function staticMain(route) {
  const items = NAV_LINKS.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join("");
  return (
    `<div id="root"><main style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem 4rem;line-height:1.6;color:#121614">` +
    `<p style="font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1805db;margin:0 0 .5rem">AirPal.Me — Life Made Easy.</p>` +
    `<h1 style="font-size:1.75rem;line-height:1.25;margin:0 0 1rem">${escapeHtml(route.heading)}</h1>` +
    `<p>${escapeHtml(route.summary)}</p>` +
    `<p>Born in The Rocks, Sydney. Operated by SarvamDaily Pty Ltd (ABN 83 702 462 977), New South Wales, Australia.</p>` +
    `<nav aria-label="AirPal.Me"><ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem">${items}</ul></nav>` +
    `</main></div>`
  );
}

function staticNoscript(route) {
  const links = NAV_LINKS.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join(" · ");
  return (
    `<noscript><div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem;line-height:1.6;color:#121614">` +
    `<p><strong>AirPal.Me — ${escapeHtml(route.heading)}.</strong> The full interactive app needs JavaScript. You can still reach us:</p>` +
    `<p>${links}</p>` +
    `</div></noscript>`
  );
}

function renderRoute(baseHtml, route) {
  if (!/^\/[a-z-]+(?:\/[a-z-]+)?$/.test(route.path)) {
    throw new Error(`prerender: bad path ${JSON.stringify(route.path)}`);
  }
  for (const key of ["title", "description", "heading", "summary"]) {
    if (!route[key] || typeof route[key] !== "string") throw new Error(`prerender: ${route.path} missing ${key}`);
  }
  const url = `${ORIGIN}${route.path}`;
  let html = baseHtml;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(route.title)}</title>`, "<title>");
  html = replaceOnce(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    "meta description",
  );
  html = replaceOnce(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
    "canonical link",
  );
  html = replaceOnce(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, metaTag("og:url", url), "og:url");
  html = replaceOnce(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    metaTag("og:title", route.title),
    "og:title",
  );
  html = replaceOnce(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    metaTag("og:description", route.description),
    "og:description",
  );
  html = replaceOnce(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    "twitter:title",
  );
  html = replaceOnce(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    "twitter:description",
  );
  if (route.jsonLd !== undefined) {
    if (!Array.isArray(route.jsonLd) || route.jsonLd.length === 0) {
      throw new Error(`prerender: ${route.path} jsonLd must be a non-empty array`);
    }
    const blocks = route.jsonLd.map((block) => {
      if (!block || typeof block !== "object" || typeof block["@type"] !== "string") {
        throw new Error(`prerender: ${route.path} jsonLd blocks must declare @type`);
      }
      const json = JSON.stringify(block);
      if (json.includes("</script")) throw new Error(`prerender: ${route.path} jsonLd must not contain </script`);
      return `<script type="application/ld+json">${json}</script>`;
    });
    html = replaceOnce(html, /<\/head>/, `${blocks.join("")}</head>`, "head close for jsonLd");
  }
  // No nested <div> inside the #root placeholder (enforced by seo:check), so
  // the first </div> after the marker closes #root itself.
  html = replaceOnce(html, /<div id="root">[\s\S]*?<\/div>/, staticMain(route), "#root placeholder");
  html = replaceOnce(html, /<noscript>[\s\S]*?<\/noscript>/, staticNoscript(route), "<noscript>");
  return html;
}

/** Plain-text length of the served body — the audit's own word_count signal. */
function bodyTextLength(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] || "";
  return body
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function main() {
  const baseHtml = readFileSync(resolve(root, "dist/index.html"), "utf8");
  const routes = JSON.parse(readFileSync(resolve(root, "scripts/prerender-routes.json"), "utf8"));
  if (!Array.isArray(routes) || routes.length === 0) throw new Error("prerender: no routes in prerender-routes.json");
  for (const route of routes) {
    const html = renderRoute(baseHtml, route);
    if (!html.includes(`<link rel="canonical" href="${ORIGIN}${route.path}" />`)) {
      throw new Error(`prerender: ${route.path} missing self-referencing canonical`);
    }
    if (bodyTextLength(html) < 200) throw new Error(`prerender: ${route.path} body text too short`);
    const outDir = resolve(root, `dist${route.path}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "index.html"), html);
    console.log(`prerendered ${route.path}`);
  }
  console.log(`Prerender complete (${routes.length} routes).`);
}

main();
