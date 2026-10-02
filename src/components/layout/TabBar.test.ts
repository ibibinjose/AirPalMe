import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TabBar } from "./TabBar";

vi.mock("wouter", () => ({
  useLocation: () => ["/explore", vi.fn()],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: undefined }) }));
vi.mock("@/contexts/BioContext", () => ({ useBio: () => ({ mine: undefined }) }));
vi.mock("@/lib/keyboard", () => ({ useVirtualKeyboard: () => ({ isKeyboardOpen: false }) }));

describe("TabBar", () => {
  it("keeps the active tab icon an outline (never a solid fill)", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/explore" }));
    // The active tab carries aria-current and renders its lucide icon.
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("<svg");
    // Solid-filling an outline icon turns it into an unreadable blob on the pill.
    expect(markup).not.toContain('fill="currentColor"');
    expect(markup).toContain('fill="none"');
  });

  it("labels the plan tab Plan", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/plan" }));
    expect(markup).toContain(">Plan<");
    expect(markup).not.toContain(">Trips<");
  });
});
