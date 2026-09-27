import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeSearchTerm, useSearchAutocomplete } from "./useSearchQueryLogger";

function TestAutocompleteComponent({ query }: { query: string }) {
  const { suggestions } = useSearchAutocomplete(query, {
    fallbackDefaults: ["Bondi Beach", "Surry Hills", "Bonnyrigg Heights", "Harbour View"],
  });
  return createElement(
    "ul",
    null,
    suggestions.map((s) => createElement("li", { key: s.id }, `${s.matchType}:${s.term}`)),
  );
}

describe("useSearchQueryLogger", () => {
  it("normalizes search query strings into consistent group keys", () => {
    expect(normalizeSearchTerm("  Bondi Beach  ")).toBe("bondi-beach");
    expect(normalizeSearchTerm("Surry Hills Cafe!")).toBe("surry-hills-cafe");
    expect(normalizeSearchTerm("LIVE MUSIC")).toBe("live-music");
    expect(normalizeSearchTerm("   ")).toBe("");
  });

  it("handles special characters and accents cleanly", () => {
    expect(normalizeSearchTerm("Café & Restaurant")).toBe("cafe-restaurant");
    expect(normalizeSearchTerm("@mate")).toBe("mate");
  });

  it("provides prefix and substring autocomplete suggestions based on query", () => {
    const html = renderToStaticMarkup(createElement(TestAutocompleteComponent, { query: "bon" }));
    expect(html).toContain("prefix:Bondi Beach");
  });

  it("returns trending suggestions when query is empty", () => {
    const html = renderToStaticMarkup(createElement(TestAutocompleteComponent, { query: "" }));
    expect(html).toContain("trending:");
  });
});

