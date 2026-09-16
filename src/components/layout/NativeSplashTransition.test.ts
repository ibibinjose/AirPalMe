import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NativeSplashTransition } from "./NativeSplashTransition";

vi.mock("@/lib/native", () => ({
  hideNativeSplash: vi.fn().mockResolvedValue(undefined),
  isNativeApp: vi.fn().mockReturnValue(true),
}));

describe("NativeSplashTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders branded splash elements with AirPal logo, name, and tagline", () => {
    const html = renderToStaticMarkup(createElement(NativeSplashTransition));

    expect(html).toContain("AirPal");
    expect(html).toContain(".me");
    expect(html).toContain("Life Made Easy.");
    expect(html).toContain('src="/logo-mark.png"');
    expect(html).toContain('id="native-splash-transition"');
  });

  it("includes pointer-events-none so interactions are never blocked", () => {
    const html = renderToStaticMarkup(createElement(NativeSplashTransition));

    expect(html).toContain("pointer-events-none");
    expect(html).toContain('aria-hidden="true"');
  });
});
