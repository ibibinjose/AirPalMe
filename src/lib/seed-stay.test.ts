import { describe, expect, it } from "vitest";
import {
  DEMO_HOTEL_PROPERTY_ID,
  DEMO_HOTEL_PUBLIC_PATH,
  DEMO_HOTEL_ROOM_TOKEN,
  demoHotelStayPath,
  HARBOUR_DEMO_WIFI_PASSWORD,
  harbourStaySeeds,
} from "./seed-stay";

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

describe("Demo Hotel showcase constants", () => {
  it("points at Harbour room 101 with a shareable public path", () => {
    expect(DEMO_HOTEL_PUBLIC_PATH).toBe("/DemoHotel");
    expect(DEMO_HOTEL_PROPERTY_ID).toBe("harbour-hotel");
    expect(DEMO_HOTEL_ROOM_TOKEN).toBe("tok-101-demo");
    expect(demoHotelStayPath()).toBe("/g/harbour-hotel?r=tok-101-demo");
    const seed = harbourStaySeeds().find((s) => s.property.id === DEMO_HOTEL_PROPERTY_ID);
    expect(seed?.property.roomTokens?.[DEMO_HOTEL_ROOM_TOKEN]).toBe("101");
  });
});
