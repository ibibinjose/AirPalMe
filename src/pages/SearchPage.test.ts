import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { SearchPage } from "./SearchPage";
import { AppProviders } from "@/app/providers";

const staticHook = (): [string, (to: string) => void] => ["/search?q=sydney", () => undefined];

describe("SearchPage (Full Search)", () => {
  it("renders full search page with SearchBar and categories", () => {
    const html = renderToStaticMarkup(
      createElement(
        Router,
        { hook: staticHook },
        createElement(AppProviders, null, createElement(SearchPage)),
      ),
    );

    expect(html).toContain("Search AirPal");
    expect(html).toContain('type="search"');
    expect(html).toContain("People &amp; Mates");
    expect(html).toContain("Places");
    expect(html).toContain("Events");
    expect(html).toContain("Experiences");
    expect(html).toContain("Stays");
    expect(html).toContain("Plans");
  });
});
