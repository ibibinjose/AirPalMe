import { describe, expect, it } from "vitest";
import { handleFromPlaceId } from "../../shared/bio";
import { hrefForPlace, hrefForStall, placeAsBio, stallAsBio } from "./bio-handle";
import { SEED_STALLS } from "../../shared/event";

describe("bio handle joins", () => {
  it("opens a place on its @handle", () => {
    expect(handleFromPlaceId("fortune-of-war")).toBe("fortuneofwar");
    expect(hrefForPlace({ id: "fortune-of-war" })).toBe("/@fortuneofwar");
    expect(hrefForPlace({ id: "cut-bar-grill", handle: "cutbar" })).toBe("/@cutbar");
  });

  it("opens a stall on its @handle", () => {
    const stall = SEED_STALLS.find((s) => s.handle === "saltedcaramel")!;
    expect(hrefForStall(stall)).toBe("/@saltedcaramel");
    expect(hrefForStall({ id: "st-x", eventId: "evt-1" })).toBe("/e/evt-1/s/st-x");
  });

  it("builds a claimable stall bio", () => {
    const stall = SEED_STALLS.find((s) => s.handle === "saltedcaramel")!;
    const bio = stallAsBio(stall, "saltedcaramel");
    expect(bio.id).toBe("stall-st-salt");
    expect(bio.deals[0]?.title).toBe("2 for $10");
    expect(bio.eventId).toBe(stall.eventId);
  });

  it("copies maps and phone onto a place bio", () => {
    const bio = placeAsBio(
      {
        id: "fortune-of-war",
        name: "Fortune of War",
        category: "eat",
        shortWhy: "Oldest pub",
        geo: { lat: 1, lng: 2 },
        hours: "10am–late",
        source: "seed",
        status: "active",
        precinctId: "the-rocks",
        phone: "+61 2 0000",
        mapsPlaceId: "ChIJtest",
        deal: { badge: "Taste", detail: "With a meal." },
      },
      "fortuneofwar",
    );
    expect(bio.mapsPlaceId).toBe("ChIJtest");
    expect(bio.phone).toBe("+61 2 0000");
    expect(bio.deals[0]?.title).toBe("Taste");
  });
});
