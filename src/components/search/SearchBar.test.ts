import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchBar } from "./SearchBar";

describe("SearchBar component", () => {
  it("renders mobile-friendly search input with placeholder and search semantics", () => {
    const html = renderToStaticMarkup(
      createElement(SearchBar, {
        value: "",
        onChange: () => {},
        placeholder: "Search Sydney places…",
      }),
    );

    expect(html).toContain('placeholder="Search Sydney places…"');
    expect(html).toContain('type="search"');
    expect(html).toContain('inputMode="search"');
    expect(html).toContain('enterKeyHint="search"');
    // iOS font-size 16px to prevent safari auto-zoom
    expect(html).toContain("text-[16px]");
  });

  it("renders clear button when value is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SearchBar, {
        value: "Surry Hills",
        onChange: () => {},
      }),
    );

    expect(html).toContain('aria-label="Clear search"');
    expect(html).toContain('value="Surry Hills"');
  });

  it("renders full search action when configured", () => {
    const html = renderToStaticMarkup(
      createElement(SearchBar, {
        value: "Bondi Beach",
        onChange: () => {},
        onFullSearch: () => {},
        showFullSearchAction: true,
        fullSearchLabel: "Search Everywhere",
      }),
    );

    expect(html).toContain("Search Everywhere");
    expect(html).toContain("Full search for");
  });

  it("renders with combobox and autocomplete ARIA attributes", () => {
    const html = renderToStaticMarkup(
      createElement(SearchBar, {
        value: "coastal",
        onChange: () => {},
        enableAutocomplete: true,
      }),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-controls="search-autocomplete-listbox"');
  });
});
