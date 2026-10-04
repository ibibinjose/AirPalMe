import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { AttractionsPage } from "./AttractionsPage";

const staticHook = (): [string, (to: string) => void] => ["/explore/attractions", () => undefined];

describe("AttractionsPage", () => {
  it("renders the first Sydney DayPass cluster with placeholder booking only", () => {
    const html = renderToStaticMarkup(createElement(Router, { hook: staticHook }, createElement(AttractionsPage)));

    expect(html).toContain("Sydney DayPasses");
    expect(html).toContain("Life Made Easy");
    expect(html).toContain("SEA LIFE Sydney");
    expect(html).toContain("WILD LIFE Sydney");
    expect(html).toContain("Madame Tussauds Sydney");
    expect(html).toContain("Sydney Tower Eye");
    expect(html).toContain("Taronga Zoo");
    expect(html).toContain("Family Day");
    expect(html).toContain("Booking link pending");
    expect(html).not.toMatch(/href="https?:/);
    expect(html).not.toContain("awin");
    expect(html.toLowerCase()).not.toContain("partnerize");
  });
});
