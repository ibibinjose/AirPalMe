import { describe, expect, it } from "vitest";
import { HARBOUR_DEMO_WIFI_PASSWORD, harbourStaySeeds } from "./seed-stay";

describe("harbourStaySeeds", () => {
  it("publishes Harbour Hotel without a Wi-Fi password on the public doc", () => {
    const stays = harbourStaySeeds();
    expect(stays.map((s) => s.property.id)).toEqual(["harbour-hotel", "harbour-rocks-hotel-6cbbce"]);
    for (const stay of stays) {
      expect(stay.property.name).toMatch(/(AirPal|Harbour)/);
      expect(stay.property.wifi.password).toBe("");
      expect(stay.property.wifi.network).toBeTruthy();
      expect(stay.property.lobbyMarkerId).toBe("97a4e8add3a8c668");
      expect(stay.property.roomTokens?.["tok-101-demo"]).toBe("101");
      expect(stay.secrets.wifiPassword).toBe(HARBOUR_DEMO_WIFI_PASSWORD);
      expect(stay.menu.length).toBeGreaterThan(0);
      expect(stay.qrCodes.some((q) => q.token === "tok-101-demo" && q.roomNumber === "101")).toBe(true);
    }
  });
});
