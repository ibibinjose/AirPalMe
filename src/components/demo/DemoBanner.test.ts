import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { DemoBanner } from "./DemoBanner";

const staticHook = (): [string, (to: string) => void] => ["/DemoHotel", () => undefined];

function bannerHtml() {
  return renderToStaticMarkup(
    createElement(Router, { hook: staticHook }, createElement(DemoBanner)),
  );
}

describe("DemoBanner", () => {
  it("frames the demo for a first-time viewer", () => {
    const html = bannerHtml();
    expect(html).toContain("Live demo.");
    expect(html).toContain("scanning the room QR");
  });

  it("hands the viewer the next steps: share sheet trigger and about link", () => {
    const html = bannerHtml();
    expect(html).toContain("Show someone");
    expect(html).toContain("What is AirPal?");
    expect(html).toContain('href="/about"');
  });
});
