import jwt from "jsonwebtoken";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { db } from "./admin";

/**
 * Google Wallet save links: GET /api/wallet/google/ticket/:id and
 * GET /api/wallet/google/card/:handle (see firebase.json rewrite).
 *
 * Answers `{ saveUrl }` — a signed JWT the client opens at
 * pay.google.com/gp/v/save/:jwt. Class + object travel in one JWT so no
 * pre-provisioning is needed beyond the issuer. Needs the service-account
 * key (docs/APPLE-WALLET.md); without it every request answers 501.
 */

const saJsonSecret = defineSecret("GOOGLE_WALLET_SA_JSON");
const issuerIdSecret = defineSecret("GOOGLE_WALLET_ISSUER_ID");

type SecretParam = { value: () => string };

function readSecret(param: SecretParam, envName: string): string {
  try {
    const value = param.value();
    if (value) return value;
  } catch {
    /* fall through to env (emulator / tests) */
  }
  return process.env[envName] || "";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function getDocData(collection: string, id: string): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

interface GoogleConfig {
  issuerId: string;
  clientEmail: string;
  privateKey: string;
}

export function googleConfigFromEnv(): GoogleConfig | null {
  const issuerId = readSecret(issuerIdSecret, "GOOGLE_WALLET_ISSUER_ID").trim();
  const raw = readSecret(saJsonSecret, "GOOGLE_WALLET_SA_JSON").trim();
  if (!issuerId || !raw) return null;
  try {
    const sa = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
    if (typeof sa.client_email !== "string" || typeof sa.private_key !== "string") return null;
    if (!sa.private_key.includes("BEGIN")) return null;
    return { issuerId, clientEmail: sa.client_email, privateKey: sa.private_key };
  } catch {
    return null;
  }
}

/** Wallet object ids allow letters, digits, `.`, `_`, `-` only. */
export function sanitizeObjectId(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "unknown";
}

function text(value: string): { defaultValue: { language: string; value: string } } {
  return { defaultValue: { language: "en", value } };
}

function parseTime(time: string): { hours: number; minutes: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return null;
  return { hours: Number(m[1]) % 24, minutes: Number(m[2]) % 60 };
}

export interface TicketObjectInput {
  issuerId: string;
  bookingId: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  guestName: string;
}

export function ticketSavePayload(input: TicketObjectInput): Record<string, unknown> {
  const classId = `${input.issuerId}.airpal_event_ticket`;
  const time = parseTime(input.time);
  return {
    eventTicketClasses: [{ id: classId, issuerName: "AirPal" }],
    eventTicketObjects: [
      {
        id: `${input.issuerId}.${sanitizeObjectId(input.bookingId)}`,
        classId,
        state: "ACTIVE",
        eventName: text(input.title),
        dateTime: {
          start: {
            date: input.date || undefined,
            ...(time ? { time, timeZone: { id: "Australia/Sydney" } } : {}),
          },
        },
        venue: { name: text(input.venue), address: text(input.venue) },
        ticketHolder: { name: text(input.guestName) },
        ticketNumber: input.bookingId,
        barcode: { type: "QR_CODE", value: input.bookingId },
        hexBackgroundColor: "#1805db",
      },
    ],
  };
}

export interface CardObjectInput {
  issuerId: string;
  handle: string;
  name: string;
  bio: string;
}

export function cardSavePayload(input: CardObjectInput): Record<string, unknown> {
  const classId = `${input.issuerId}.airpal_profile_card`;
  const url = `https://airpal.me/@${input.handle}`;
  return {
    genericClasses: [{ id: classId, issuerName: "AirPal" }],
    genericObjects: [
      {
        id: `${input.issuerId}.${sanitizeObjectId(input.handle)}`,
        classId,
        state: "ACTIVE",
        cardTitle: text(input.name),
        header: text(`@${input.handle}`),
        logo: {
          sourceUri: { uri: "https://airpal.me/logo-mark.png" },
          contentDescription: text("AirPal"),
        },
        ...(input.bio ? { textModulesData: [{ header: "ABOUT", body: input.bio.slice(0, 200) }] } : {}),
        barcode: { type: "QR_CODE", value: url },
        linksModuleData: { uris: [{ uri: url, description: "View profile" }] },
        hexBackgroundColor: "#1805db",
      },
    ],
  };
}

export function mintSaveJwt(cfg: GoogleConfig, payload: Record<string, unknown>): string {
  const claims = {
    iss: cfg.clientEmail,
    aud: "google",
    typ: "savetowallet",
    origins: ["https://airpal.me"],
    payload,
  };
  return jwt.sign(claims, cfg.privateKey, { algorithm: "RS256" });
}

async function guestNameFor(customerUid: string): Promise<string> {
  if (!customerUid) return "Guest";
  try {
    const user = await getDocData("users", customerUid);
    return str(user?.displayName) || str(user?.firstName) || "Guest";
  } catch {
    return "Guest";
  }
}

export const googleWalletPass = onRequest(
  { invoker: "public", secrets: [saJsonSecret, issuerIdSecret] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method not allowed");
      return;
    }
    const match = /\/google\/(ticket|card)\/([^/?#]+)/.exec(req.path || "");
    if (!match) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const kind = match[1] as "ticket" | "card";
    const key = decodeURIComponent(match[2] as string);
    const cfg = googleConfigFromEnv();
    if (!cfg) {
      res.status(501).json({ error: "google_wallet_not_configured" });
      return;
    }
    try {
      let payload: Record<string, unknown> | null = null;
      if (kind === "ticket") {
        const booking = await getDocData("bookings", key);
        if (!booking) {
          res.status(404).json({ error: "booking_not_found" });
          return;
        }
        let eventName = "";
        const eventId = str(booking.eventId);
        if (eventId) eventName = str((await getDocData("events", eventId))?.name);
        payload = ticketSavePayload({
          issuerId: cfg.issuerId,
          bookingId: key,
          title: eventName || str(booking.title) || "AirPal booking",
          date: str(booking.date),
          time: str(booking.time),
          venue: str(booking.suburb) || str(booking.providerName) || "AirPal",
          guestName: await guestNameFor(str(booking.customerUid)),
        });
      } else {
        const normalized = key.trim().replace(/^@+/, "").toLowerCase();
        const profileId = str((await getDocData("handles", normalized))?.profileId);
        const profile = profileId ? await getDocData("profiles", profileId) : null;
        if (!profile) {
          res.status(404).json({ error: "profile_not_found" });
          return;
        }
        payload = cardSavePayload({
          issuerId: cfg.issuerId,
          handle: normalized,
          name: str(profile.displayName) || str(profile.firstName) || `@${normalized}`,
          bio: str(profile.bio),
        });
      }
      const saveUrl = `https://pay.google.com/gp/v/save/${mintSaveJwt(cfg, payload)}`;
      res.status(200).json({ saveUrl });
    } catch (err) {
      console.error("googleWalletPass failed:", err);
      res.status(500).json({ error: "google_wallet_failed" });
    }
  },
);
