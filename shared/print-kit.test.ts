import { describe, expect, it } from "vitest";
import { roomCardRows, SCAN_AIRPAL_HEADLINE } from "./print-kit";

describe("print kit", () => {
  it("prints the nearby headline", () => {
    expect(SCAN_AIRPAL_HEADLINE).toBe("Scan AirPalMe — what’s around you");
  });

  it("builds room cards from opaque tokens, sorted by room number", () => {
    const rows = roomCardRows({
      propertyId: "p_stay",
      roomTokens: { tokB: "102", tokA: "101", tokC: "11" },
      origin: "https://airpalme-app.web.app",
    });
    expect(rows.map((row) => row.label)).toEqual(["Room 11", "Room 101", "Room 102"]);
    expect(rows[1]?.url).toBe("https://airpalme-app.web.app/g/p_stay?r=tokA&type=room");
  });
});
