import QRCode from "qrcode";
import { buildStayUrl, parseVanityOrMarkerPath, type StayUrlOptions } from "@shared/airpal-urls";

export type QrIntent =
  | { kind: "stay"; propertyId: string; room?: string; roomToken?: string; type?: string }
  | { kind: "campus"; campusId: string; room?: string }
  | { kind: "marker"; markerId: string }
  | { kind: "vanity"; city: string; handle: string }
  | { kind: "url"; href: string }
  | { kind: "unknown"; raw: string };

export function stayQrPayload(propertyId: string, roomOrOptions: string | StayUrlOptions = "101") {
  const origin = typeof window === "undefined" ? "https://airpal.me" : window.location.origin;
  if (typeof roomOrOptions === "string") {
    return buildStayUrl(propertyId, { room: roomOrOptions, type: "room", origin });
  }
  return buildStayUrl(propertyId, { ...roomOrOptions, origin });
}

export async function makeQrDataUrl(text: string, size = 280) {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "H",
    color: { dark: "#121614", light: "#ffffff" },
  });
}

export function parseQrPayload(raw: string): QrIntent {
  const value = raw.trim();
  try {
    const url = new URL(value, typeof window === "undefined" ? "https://airpal.me" : window.location.origin);
    const qPath = parseVanityOrMarkerPath(url.pathname);
    if (qPath.kind === "marker") return { kind: "marker", markerId: qPath.markerId };
    if (qPath.kind === "vanity") return { kind: "vanity", city: qPath.city, handle: qPath.handle };
    const stay = url.pathname.match(/^\/g\/([^/]+)/);
    if (stay?.[1]) {
      return {
        kind: "stay",
        propertyId: stay[1],
        roomToken: url.searchParams.get("r") || undefined,
        room: url.searchParams.get("room") || undefined,
        type: url.searchParams.get("type") || undefined,
      };
    }
    const campus = url.pathname.match(/^\/c\/([^/]+)/);
    if (campus?.[1]) {
      return { kind: "campus", campusId: campus[1], room: url.searchParams.get("room") || undefined };
    }
    const at = url.pathname.match(/^\/@([a-z0-9._]{3,30})/i);
    if (at?.[1]) {
      return { kind: "url", href: `/@${at[1].toLowerCase()}` };
    }
    const expo = url.pathname.match(/^\/e\/([^/]+)/);
    if (expo?.[1]) {
      return { kind: "url", href: url.pathname + url.search };
    }
    const origin = typeof window === "undefined" ? "https://airpal.me" : window.location.origin;
    if (url.origin === origin || url.hostname.includes("airpal")) {
      return { kind: "url", href: url.pathname + url.search };
    }
  } catch {
    /* fall through */
  }
  const tagged = value.match(/^AIRPAL:MARKER:(.+)$/i);
  if (tagged?.[1]) return { kind: "marker", markerId: tagged[1] };
  return { kind: "unknown", raw: value };
}

export function pathForIntent(intent: QrIntent): string | null {
  switch (intent.kind) {
    case "stay": {
      const params = new URLSearchParams();
      if (intent.roomToken) params.set("r", intent.roomToken);
      if (intent.room) params.set("room", intent.room);
      if (intent.type) params.set("type", intent.type);
      const qs = params.toString();
      return `/g/${intent.propertyId}${qs ? `?${qs}` : ""}`;
    }
    case "campus":
      return `/c/${intent.campusId}${intent.room ? `?room=${intent.room}` : ""}`;
    case "marker":
      return `/q/${intent.markerId}`;
    case "vanity":
      return `/q/${intent.city}/${intent.handle}`;
    case "url":
      return intent.href;
    default:
      return null;
  }
}
