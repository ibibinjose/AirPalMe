import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { SearchAnalyticsPage } from "./SearchAnalyticsPage";
import { AppProviders } from "@/app/providers";

const staticHook = (): [string, (to: string) => void] => ["/search/analytics", () => undefined];

describe("SearchAnalyticsPage", () => {
  it("renders search analytics dashboard with KPIs and Recharts containers", () => {
    const html = renderToStaticMarkup(
      createElement(
        Router,
        { hook: staticHook },
        createElement(AppProviders, null, createElement(SearchAnalyticsPage)),
      ),
    );

    expect(html).toContain("Search Analytics &amp; Trends");
    expect(html).toContain("Total Logged Searches");
    expect(html).toContain("Unique Search Terms");
    expect(html).toContain("Top Trending Query");
    expect(html).toContain("Search Volume Trends Over Time");
    expect(html).toContain("Top Search Queries");
    expect(html).toContain("Search Share by Category");
    expect(html).toContain("Popular Search Terms Table");
  });
});
