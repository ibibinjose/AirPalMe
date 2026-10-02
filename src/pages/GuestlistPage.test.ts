import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { fakes } = vi.hoisted(() => ({
  fakes: { uid: null as string | null, route: "event" as "event" | "plan" },
}));

vi.mock("wouter", () => ({
  useRoute: (pattern: string) => {
    if (pattern === "/e/:id/guests") return [fakes.route === "event", { id: "evt-1" }];
    if (pattern === "/plan/:id/guests") return [fakes.route === "plan", { id: "plan-1" }];
    return [false, {}];
  },
  useLocation: () => ["/", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: fakes.uid ? { uid: fakes.uid } : undefined, isAdmin: false }),
}));
vi.mock("@/lib/firebase", () => ({ getFirebaseDb: () => undefined }));

import { GuestlistPage } from "./GuestlistPage";

function render(uid: string | null, route: "event" | "plan") {
  fakes.uid = uid;
  fakes.route = route;
  return renderToStaticMarkup(createElement(GuestlistPage));
}

describe("GuestlistPage", () => {
  it("gates signed-out visitors on both scopes", () => {
    const eventMarkup = render(null, "event");
    expect(eventMarkup).toContain("Guestlist");
    expect(eventMarkup).toContain("Sign in");
    const planMarkup = render(null, "plan");
    expect(planMarkup).toContain("Guestlist");
    expect(planMarkup).toContain("Sign in");
  });

  it("renders the loading shell for signed-in viewers (live data needs effects)", () => {
    const markup = render("org-1", "event");
    expect(markup).not.toContain("Door team only");
    expect(markup).not.toContain("Add a walk-in");
  });
});
