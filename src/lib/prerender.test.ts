import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { routeMetaFor } from "./share-meta";
import { buildTrustJsonLd } from "./trust-meta";

const root = resolve(import.meta.dirname, "../..");

interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  heading: string;
  summary: string;
  jsonLd?: unknown;
}

function loadRoutes(): PrerenderRoute[] {
  return JSON.parse(readFileSync(resolve(root, "scripts/prerender-routes.json"), "utf8"));
}

const PRIVATE_PREFIXES = ["/admin", "/me/", "/host", "/g/", "/invite/", "/q/", "/bio/", "/auth", "/api/"];

describe("prerender routes", () => {
  it("lists unique public paths with complete copy", () => {
    const routes = loadRoutes();
    expect(routes.length).toBeGreaterThan(0);
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const route of routes) {
      expect(route.path).toMatch(/^\/[a-z-]+(?:\/[a-z-]+)?$/);
      expect(PRIVATE_PREFIXES.some((p) => route.path.startsWith(p))).toBe(false);
      for (const key of ["title", "description", "heading", "summary"] as const) {
        expect(route[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("matches the client-side route meta crawlers would see after hydration", () => {
    for (const route of loadRoutes()) {
      const meta = routeMetaFor(route.path);
      expect(meta, `${route.path} must have client-side route meta`).not.toBeNull();
      expect(meta!.title).toBe(route.title);
      expect(meta!.description).toBe(route.description);
    }
  });

  it("injects the same structured data the page renders", () => {
    for (const route of loadRoutes()) {
      if (route.jsonLd === undefined) continue;
      expect(route.path, "only /trust carries prerendered JSON-LD").toBe("/trust");
      expect(route.jsonLd).toEqual(buildTrustJsonLd());
    }
  });

  it("covers routes the sitemap promises to crawlers", () => {
    const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
    for (const route of loadRoutes()) {
      expect(sitemap.includes(`https://airpal.me${route.path}`), `${route.path} in sitemap`).toBe(true);
    }
  });
});
