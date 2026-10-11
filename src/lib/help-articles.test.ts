import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HELP_ARTICLES, HELP_CATEGORIES, getHelpArticle, helpArticleIdFromSearch } from "./help-articles";

const routesSource = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../app/routes.tsx"), "utf8");
const registered = new Set([...routesSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));

describe("help articles catalog", () => {
  it("has unique ids and resolves each one", () => {
    const ids = HELP_ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const article of HELP_ARTICLES) expect(getHelpArticle(article.id)).toBe(article);
    expect(getHelpArticle("nope")).toBeUndefined();
  });

  it("keeps every article complete", () => {
    expect(HELP_ARTICLES.length).toBeGreaterThan(0);
    const cats = new Set(HELP_CATEGORIES.map((c) => c.id));
    for (const article of HELP_ARTICLES) {
      expect(article.title.trim().length).toBeGreaterThan(0);
      expect(article.summary.trim().length).toBeGreaterThan(0);
      expect(cats.has(article.category)).toBe(true);
      expect(article.steps.length).toBeGreaterThanOrEqual(3);
      expect(article.links.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("links only to registered internal routes", () => {
    for (const article of HELP_ARTICLES) {
      for (const link of article.links) {
        expect(link.label.trim().length).toBeGreaterThan(0);
        expect(link.href.startsWith("/")).toBe(true);
        expect(link.href).not.toMatch(/:|https?:/);
        expect(registered.has(link.href)).toBe(true);
      }
    }
  });

  it("resolves ?a= deep links only to real articles", () => {
    expect(helpArticleIdFromSearch("?a=report-block")).toBe("report-block");
    expect(helpArticleIdFromSearch("a=report-block")).toBe("report-block");
    expect(helpArticleIdFromSearch("?a=nope")).toBeNull();
    expect(helpArticleIdFromSearch("")).toBeNull();
  });
});
