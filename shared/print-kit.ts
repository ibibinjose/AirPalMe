import { buildStayUrl } from "./airpal-urls";

export const SCAN_AIRPAL_HEADLINE = "Scan AirPalMe — what’s around you";
export const SCAN_AIRPAL_LANG_LINE = "Opens in your language · No app · No login";
export const SCAN_AIRPAL_STAY_LINE = "Wi-Fi · Staff · Dining · Nearby";

export type RoomCardRow = {
  roomNumber: string;
  token: string;
  url: string;
  label: string;
};

export function roomCardRows(input: {
  propertyId: string;
  roomTokens?: Record<string, string>;
  origin?: string;
}): RoomCardRow[] {
  const origin = input.origin || "https://airpal.me";
  return Object.entries(input.roomTokens || {})
    .map(([token, roomNumber]) => ({ token, roomNumber: String(roomNumber) }))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: "base" }))
    .map((row) => ({
      ...row,
      label: `Room ${row.roomNumber}`,
      url: buildStayUrl(input.propertyId, { roomToken: row.token, type: "room", origin }),
    }));
}
