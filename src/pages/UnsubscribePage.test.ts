import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("wouter", () => ({
  useSearch: () => "?email=ava%40example.com",
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));

import { UnsubscribePage } from "./UnsubscribePage";

describe("UnsubscribePage", () => {
  it("prefills the email from the link and offers one-tap leave", () => {
    const markup = renderToStaticMarkup(createElement(UnsubscribePage));
    expect(markup).toContain("Unsubscribe");
    expect(markup).toContain("ava@example.com");
    expect(markup).toContain("Unsubscribe me");
  });
});
