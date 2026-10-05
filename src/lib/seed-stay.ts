import { CURRENT_PROPERTY, IN_ROOM_DINING_MENU, type MenuItem, type PropertyInfo } from "@shared/airpal-data";
import { HARBOUR_ROCKS_LOBBY_MARKER_ID, HARBOUR_ROCKS_PROPERTY_ID } from "@shared/the-rocks-data";
import { toPublicPropertyDoc } from "@shared/host-property";

/** Demo guest Wi-Fi — private/hostSecrets only. Never written on the public property doc. */
export const HARBOUR_DEMO_WIFI_PASSWORD = "HarbourGuest26";
export const HARBOUR_SEED_OWNER_ID = "seed-harbour-hotel";

export type HarbourStaySeed = {
  property: PropertyInfo;
  secrets: { wifiNetwork: string; wifiPassword: string };
  menu: MenuItem[];
  qrCodes: Array<{ token: string; roomNumber: string }>;
};

function withStayMeta(property: PropertyInfo): PropertyInfo {
  return {
    ...property,
    kind: property.kind || "hotel",
    ownerId: property.ownerId || HARBOUR_SEED_OWNER_ID,
    lobbyMarkerId: property.lobbyMarkerId || HARBOUR_ROCKS_LOBBY_MARKER_ID,
    precinctId: property.precinctId || "the-rocks",
    countryCode: property.countryCode || "AU",
    state: property.state || "NSW",
    postalCode: property.postalCode || "2000",
    wifi: {
      network: property.wifi?.network || "HarbourHotel_Guest",
      password: "",
      speed: property.wifi?.speed || "250 Mbps High-Speed Fibre",
    },
    status: "active",
  };
}

/** Canonical demo stay (`/g/harbour-hotel`) plus the Rocks marker property id. */
export function harbourStaySeeds(): HarbourStaySeed[] {
  const harbour = withStayMeta(CURRENT_PROPERTY);
  const rocks: PropertyInfo = withStayMeta({
    ...CURRENT_PROPERTY,
    id: HARBOUR_ROCKS_PROPERTY_ID,
    name: "AirPal Hotel · The Rocks",
    tagline: "AirPal Boutique Template Stay in Sydney",
    handle: "harbour-rocks-hotel",
    slug: "harbour-rocks-hotel",
    vanityKey: "sydney/harbour-rocks-hotel",
    lobbyMarkerId: HARBOUR_ROCKS_LOBBY_MARKER_ID,
  });

  return [harbour, rocks].map((property) => {
    const publicProperty = toPublicPropertyDoc(property);
    const tokens = publicProperty.roomTokens || { "tok-101-demo": "101" };
    return {
      property: publicProperty,
      secrets: {
        wifiNetwork: publicProperty.wifi.network,
        wifiPassword: HARBOUR_DEMO_WIFI_PASSWORD,
      },
      menu: IN_ROOM_DINING_MENU.map((item) => ({ ...item, propertyId: publicProperty.id })),
      qrCodes: Object.entries(tokens).map(([token, roomNumber]) => ({ token, roomNumber })),
    };
  });
}

export const DEMO_HOTEL_PROPERTY_ID = "harbour-hotel";
export const DEMO_HOTEL_ROOM_TOKEN = "tok-101-demo";

/** Underlying stay URL that DemoHotel seeds into StayContext (same as a room QR). */
export function demoHotelStayPath(): string {
  return `/g/${DEMO_HOTEL_PROPERTY_ID}?r=${DEMO_HOTEL_ROOM_TOKEN}`;
}
