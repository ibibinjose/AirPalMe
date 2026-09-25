import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NativeOpenScreen } from "./NativeOpenScreen";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    loginWithSocial: vi.fn(),
    authReady: true,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/lib/native", () => ({
  triggerHaptic: vi.fn(),
  isNativeApp: () => true,
}));

describe("NativeOpenScreen", () => {
  it("renders brand opening copy and sign-in actions", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain("data-testid=\"native-open-screen\"");
    expect(html).toContain("AirPal");
    expect(html).toContain("Life Made Easy.");
    expect(html).not.toContain("Continue with Google");
    expect(html).not.toContain("Continue with Apple");
    expect(html).toContain("Sign in with email or phone");
    expect(html).toContain("Create a free account");
  });
});
