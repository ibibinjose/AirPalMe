/**
 * Opaque IDs + locked AirPal URL scheme.
 *
 *  /q/{markerHex}           — physical marker → Nearby (+ optional venue card)
 *  /q/{city}/{handle}       — public vanity (Nearby + public profile; no stay privileges)
 *  /g/{propertyId}?r={token} — guest stay companion (opaque room token)
 *  Compat: /g/{id}?type=room&room=101 still parses (prefer ?r= for new QRs)
 */

const ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function randomBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < size; i++) out[i] = Math.floor(Math.random() * 256) & 0xff;
  return out;
}

function randomAlphabet(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length];
  return out;
}

function randomHex(byteLength: number): string {
  const bytes = randomBytes(byteLength);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Opaque property doc id: p_ + 10 URL-safe chars. Never a name-slug. */
export function generatePropertyId(): string {
  return `p_${randomAlphabet(10)}`;
}

/** Opaque per-room token for ?r= (not a human room number). */
export function generateRoomToken(): string {
  return randomAlphabet(12);
}

/** Opaque physical marker id (hex) for /q/{markerHex}. */
export function generateMarkerId(): string {
  return randomHex(8);
}

/** Public vanity handle from a display name (separate from propertyId). */
export function slugifyHandle(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "property"
  );
}

export function slugifyCity(city: string): string {
  return (
    city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "city"
  );
}

export type VanityPath =
  | { kind: "marker"; markerId: string }
  | { kind: "vanity"; city: string; handle: string }
  | { kind: "empty" }
  | { kind: "invalid"; raw: string };

/** Parse /q, /q/:a, or /q/:city/:handle (path only, no origin). */
export function parseVanityOrMarkerPath(pathname: string): VanityPath {
  const path = pathname.split("?")[0] || "";
  const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts[0] !== "q") return { kind: "invalid", raw: pathname };
  if (parts.length === 1) return { kind: "empty" };
  if (parts.length === 2 && parts[1]) {
    const markerId = parts[1];
    // Reject path-like guessable segments that look like "TheHilton"
    if (!isOpaqueMarkerSegment(markerId)) return { kind: "invalid", raw: pathname };
    return { kind: "marker", markerId };
  }
  if (parts.length >= 3 && parts[1] && parts[2]) {
    return { kind: "vanity", city: slugifyCity(parts[1]), handle: slugifyHandle(parts[2]) };
  }
  return { kind: "invalid", raw: pathname };
}

/** Marker path segments: hex or nanoid-ish (no spaces / path traversal). */
export function isOpaqueMarkerSegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]{6,64}$/.test(value);
}

export function isOpaquePropertyId(value: string): boolean {
  return /^p_[a-zA-Z0-9]{8,}$/.test(value) || /^[a-f0-9]{12,}$/i.test(value);
}

export type StayUrlOptions = {
  roomToken?: string;
  /** Legacy human room number — only for old QR compat emission. */
  room?: string;
  type?: string;
  origin?: string;
};

/** Build guest stay URL. Prefer opaque ?r=; fall back to ?room= for legacy. */
export function buildStayUrl(propertyId: string, options: StayUrlOptions = {}): string {
  const origin = options.origin ?? (typeof window !== "undefined" ? window.location.origin : "https://airpal.me");
  const params = new URLSearchParams();
  if (options.roomToken) {
    params.set("r", options.roomToken);
    if (options.type) params.set("type", options.type);
  } else if (options.room) {
    params.set("type", options.type || "room");
    params.set("room", options.room);
  } else if (options.type) {
    params.set("type", options.type);
  }
  const qs = params.toString();
  return `${origin}/g/${encodeURIComponent(propertyId)}${qs ? `?${qs}` : ""}`;
}

export function buildMarkerUrl(markerId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://airpal.me");
  return `${base}/q/${encodeURIComponent(markerId)}`;
}

export function buildVanityUrl(city: string, handle: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://airpal.me");
  return `${base}/q/${encodeURIComponent(slugifyCity(city))}/${encodeURIComponent(slugifyHandle(handle))}`;
}

export type RoomTokenMap = Record<string, string>; // token → room number

export function resolveRoomNumber(
  roomTokens: RoomTokenMap | undefined,
  roomToken: string | null | undefined,
  fallbackRoom?: string | null,
): string | null {
  const token = roomToken?.trim();
  if (token) {
    const fromToken = roomTokens?.[token];
    if (fromToken) return fromToken;
  }
  const legacy = fallbackRoom?.trim();
  return legacy || null;
}

/** Invert token→number for host QR generation. */
export function roomNumberToToken(roomTokens: RoomTokenMap | undefined, roomNumber: string): string | undefined {
  if (!roomTokens) return undefined;
  const target = roomNumber.trim();
  for (const [token, number] of Object.entries(roomTokens)) {
    if (number === target) return token;
  }
  return undefined;
}

export function defaultHotelRoomNumbers(count = 1): string[] {
  const n = Math.max(1, Math.min(count, 20));
  return Array.from({ length: n }, (_, i) => String(101 + i));
}

export function buildDefaultRoomTokens(
  kind: "hotel" | "hostel" | "campus" | "venue",
  roomsCount?: number,
): { roomTokens: RoomTokenMap; defaultRoomNumber: string; defaultRoomToken: string } {
  let numbers: string[];
  if (kind === "campus") numbers = ["R12"];
  else if (kind === "hostel") numbers = ["B12"];
  else if (kind === "venue") numbers = ["lobby"];
  else numbers = defaultHotelRoomNumbers(Math.min(roomsCount || 1, 5));

  const roomTokens: RoomTokenMap = {};
  for (const number of numbers) {
    roomTokens[generateRoomToken()] = number;
  }
  const defaultRoomNumber = numbers[0]!;
  const defaultRoomToken = roomNumberToToken(roomTokens, defaultRoomNumber)!;
  return { roomTokens, defaultRoomNumber, defaultRoomToken };
}
