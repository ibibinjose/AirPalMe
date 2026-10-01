import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { HelpPage } from "./HelpPage";
import { AppProviders } from "@/app/providers";

const staticHook = (): [string, (to: string) => void] => ["/help", () => undefined];

describe("HelpPage", () => {
  it("renders the knowledge hub with guides and categories", () => {
    const html = renderToStaticMarkup(
      createElement(
        Router,
        { hook: staticHook },
        createElement(AppProviders, null, createElement(HelpPage)),
      ),
    );

    expect(html).toContain("How can we help?");
    expect(html).toContain("Create a plan");
    expect(html).toContain("Report or block someone");
    expect(html).toContain("Trust &amp; safety");
    expect(html).toContain("Still stuck?");
  });
});
