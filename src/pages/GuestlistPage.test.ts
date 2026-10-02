import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { fakes } = vi.hoisted(() => ({
  fakes: { uid: "org-1", isAdmin: false },
}));

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "evt-1" }],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: fakes.uid }, isAdmin: fakes.isAdmin }),
}));
vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({
    calendarEvents: [{ id: "evt-1", title: "Rooftop Sessions", organiserUid: "org-1" }],
    remoteNearby: [],
    remoteLoaded: true,
    fetchRemoteEvent: async () => null,
  }),
}));
vi.mock("@/lib/firebase", () => ({ getFirebaseDb: () => undefined }));

import { GuestlistPage } from "./GuestlistPage";

describe("GuestlistPage", () => {
  it("denies strangers with an organiser-only message", () => {
    fakes.uid = "stranger";
    fakes.isAdmin = false;
    const markup = renderToStaticMarkup(createElement(GuestlistPage));
    expect(markup).toContain("Organisers only");
    expect(markup).not.toContain("Add a walk-in");
  });

  it("opens the list shell for the organiser", () => {
    fakes.uid = "org-1";
    fakes.isAdmin = false;
    const markup = renderToStaticMarkup(createElement(GuestlistPage));
    expect(markup).toContain("Guestlist");
    expect(markup).not.toContain("Organisers only");
  });
});
