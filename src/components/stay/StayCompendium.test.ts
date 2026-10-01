import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StayCompendium } from "./StayCompendium";

vi.mock("@/contexts/StayContext", () => ({
  useStay: () => ({
    property: {
      id: "unknown",
      name: "",
      tagline: "",
      destination: "",
      city: "",
      country: "",
      address: "",
      phone: "",
      whatsapp: "",
      wifi: { network: "", password: "", speed: "" },
      checkIn: "",
      checkOut: "",
      breakfast: { hours: "", location: "", type: "", price: "" },
      facilities: [],
    },
    roomLabel: null,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/DemoHotel", vi.fn()],
}));

// The floating receptionist needs live providers; this test covers compendium copy only.
vi.mock("./AirPalAiReceptionist", () => ({
  AirPalAiReceptionist: () => null,
}));

function compendiumHtml() {
  return renderToStaticMarkup(createElement(StayCompendium));
}

describe("StayCompendium honesty", () => {
  it("never renders fabricated stay facts for a property with no published data", () => {
    const html = compendiumHtml();
    for (const invented of [
      "AirPalGuest2026",
      "AirPal_Guest_HighSpeed",
      "Free throughout hostel",
      "Harbour Hotel",
      "Sydney, Australia",
      "02:30 PM",
      "11:00 AM",
      "07:30 AM",
      "Quiet Hours",
      "Non-Smoking",
      "Luggage Storage available",
      "tel:000",
      "#4829",
      "AIRPAL-WELCOME",
      "Settled",
    ]) {
      expect(html).not.toContain(invented);
    }
  });

  it("shows honest ask-reception states instead of invented details", () => {
    const html = compendiumHtml();
    expect(html).toContain("AirPal Stay");
    expect(html).toContain("Ask reception");
    expect(html).toContain("Ask the front desk for the password");
    expect(html).toContain("Reception number not listed");
    expect(html).toContain("House rules aren’t published here yet");
  });

  it("never repeats shell-owned content: no identity header, tabs, or staff picks", () => {
    const html = compendiumHtml();
    // The Stay & Guide shell hero owns the identity heading and share action.
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("Share property link");
    // Dead category tabs are gone.
    expect(html).not.toContain("Recommendations");
    // Staff picks render once, in the shell's Host recommends section.
    expect(html).not.toContain("Entertain your palate");
    expect(html).not.toContain("staffPicks");
  });

  it("offers no credential or voucher UI without a real data source behind it", () => {
    const html = compendiumHtml().toLowerCase();
    expect(html).not.toContain("door code");
    expect(html).not.toContain("free drink");
    expect(html).not.toContain("voucher");
  });
});
