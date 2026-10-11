import { PKPass } from "passkit-generator";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { ticketGateUrl } from "../../shared/booking";
import { db } from "./admin";
import { cardFieldsFromProfile } from "./pass-profile";

/**
 * Apple Wallet .pkpass endpoint: GET /api/wallet/ticket/:id.pkpass and
 * GET /api/wallet/card/:handle.pkpass (see firebase.json rewrite).
 *
 * Signing needs the brand's Pass Type ID certificate, installed as secrets
 * (docs/WALLET.md). Until then every request answers 501 and the
 * client shows "not set up yet" instead of downloading garbage.
 */

const passTypeIdSecret = defineSecret("WALLET_PASS_TYPE_ID");
const teamIdSecret = defineSecret("WALLET_TEAM_ID");
const signerCertSecret = defineSecret("WALLET_SIGNER_CERT");
const signerKeySecret = defineSecret("WALLET_SIGNER_KEY");
const keyPassphraseSecret = defineSecret("WALLET_KEY_PASSPHRASE");

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

/** Apple WWDR G4 intermediate (public, expires Dec 2030). Refetch from Apple PKI when rotating. */
const WWDR_G4_PEM = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

/** Pass icon: public/favicon-32.png, base64 (Apple requires icon.png). */
const ICON_PNG_B64 =
  "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";

type DocData = Record<string, unknown> | null;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function getDocData(collection: string, id: string): Promise<DocData> {
  if (!id) return null;
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

interface SignerConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
}

function signerConfig(): SignerConfig | null {
  const passTypeIdentifier = readSecret(passTypeIdSecret, "WALLET_PASS_TYPE_ID").trim();
  const teamIdentifier = readSecret(teamIdSecret, "WALLET_TEAM_ID").trim();
  const signerCert = readSecret(signerCertSecret, "WALLET_SIGNER_CERT");
  const signerKey = readSecret(signerKeySecret, "WALLET_SIGNER_KEY");
  if (!passTypeIdentifier || !teamIdentifier || !signerCert.includes("BEGIN") || !signerKey.includes("BEGIN")) {
    return null;
  }
  const signerKeyPassphrase = readSecret(keyPassphraseSecret, "WALLET_KEY_PASSPHRASE");
  return { passTypeIdentifier, teamIdentifier, signerCert, signerKey, signerKeyPassphrase };
}

/** Luma-style layout on AirPal Blue: date/time header, big title, location, guest + host, QR. */
export interface TicketPassInput {
  bookingId: string;
  title: string;
  date: string;
  time: string;
  suburb: string;
  providerName: string;
  status: string;
  guestName: string;
  spots?: number;
}

export interface CardPassInput {
  handle: string;
  name: string;
  bio: string;
  city?: string;
  kind?: string;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Stored local values only — no timezone claims. "2026-10-02" -> "02 OCT 2026". */
export function formatPassDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!m) return date.trim();
  const month = MONTHS[Number(m[2]) - 1] || m[2];
  return `${m[3]} ${month} ${m[1]}`;
}

/** "19:00" -> "7:00 PM". */
export function formatPassTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return time.trim();
  let hours = Number(m[1]) % 24;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${m[2]} ${suffix}`;
}

export function ticketPassJson(input: TicketPassInput): Record<string, unknown> {
  const when = [formatPassDate(input.date), formatPassTime(input.time)].filter(Boolean).join(" · ");
  return {
    formatVersion: 1,
    organizationName: "AirPal.me",
    description: `${input.title} — AirPal ticket`,
    serialNumber: `ticket-${input.bookingId}`,
    backgroundColor: "rgb(24,5,219)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(225,225,235)",
    eventTicket: {
      headerFields: [{ key: "when", label: "", value: when || "See booking" }],
      primaryFields: [{ key: "event", label: "", value: input.title }],
      secondaryFields: [{ key: "location", label: "LOCATION", value: input.suburb || input.providerName || "AirPal" }],
      auxiliaryFields: [
        { key: "guest", label: "GUEST", value: input.guestName || "Guest" },
        { key: "host", label: "HOST", value: input.providerName || "AirPal" },
      ],
      backFields: [
        { key: "booking", label: "Booking", value: input.bookingId },
        { key: "status", label: "Status", value: input.status || "booked" },
        ...(input.spots && input.spots > 1 ? [{ key: "spots", label: "Tickets", value: String(input.spots) }] : []),
      ],
    },
  };
}

export function cardPassJson(input: CardPassInput): Record<string, unknown> {
  const url = `https://airpal.me/@${input.handle}`;
  return {
    formatVersion: 1,
    organizationName: "AirPal.me",
    description: input.kind === "business" ? `${input.name} — AirPal business card` : `${input.name} on AirPal`,
    serialNumber: `card-${input.handle}`,
    backgroundColor: "rgb(24,5,219)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(225,225,235)",
    generic: {
      primaryFields: [{ key: "name", label: "AIRPAL", value: input.name }],
      secondaryFields: [{ key: "handle", label: "HANDLE", value: `@${input.handle}` }],
      auxiliaryFields: input.city ? [{ key: "city", label: "CITY", value: input.city }] : [],
      backFields: [
        { key: "profile", label: "Profile", value: url },
        ...(input.bio ? [{ key: "bio", label: "About", value: input.bio.slice(0, 200) }] : []),
      ],
    },
  };
}

async function buildPassBuffer(
  cfg: SignerConfig,
  passJson: Record<string, unknown>,
  serialNumber: string,
  barcodeMessage: string,
): Promise<Buffer> {
  const icon = Buffer.from(ICON_PNG_B64, "base64");
  const fullJson = {
    ...passJson,
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
  };
  const pass = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(fullJson)), "icon.png": icon, "icon@2x.png": icon },
    {
      wwdr: WWDR_G4_PEM,
      signerCert: cfg.signerCert,
      signerKey: cfg.signerKey,
      ...(cfg.signerKeyPassphrase ? { signerKeyPassphrase: cfg.signerKeyPassphrase } : {}),
    },
    { serialNumber },
  );
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: barcodeMessage,
    messageEncoding: "iso-8859-1",
    altText: serialNumber.replace(/^(ticket|card)-/, ""),
  });
  return pass.getAsBuffer();
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

async function ticketPassBuffer(bookingId: string, cfg: SignerConfig): Promise<Buffer | null> {
  const booking = await getDocData("bookings", bookingId);
  if (!booking) return null;
  let eventName = "";
  const eventId = str(booking.eventId);
  if (eventId) eventName = str((await getDocData("events", eventId))?.name);
  const spots = Number(booking.spots);
  const passJson = ticketPassJson({
    bookingId,
    title: eventName || str(booking.title) || "AirPal booking",
    date: str(booking.date),
    time: str(booking.time),
    suburb: str(booking.suburb),
    providerName: str(booking.providerName),
    status: str(booking.status),
    guestName: await guestNameFor(str(booking.customerUid)),
    spots: Number.isFinite(spots) && spots > 1 ? spots : undefined,
  });
  const gateUrl = ticketGateUrl({
    id: bookingId,
    eventId: str(booking.eventId) || undefined,
    planId: str(booking.planId) || undefined,
  });
  return buildPassBuffer(cfg, passJson, `ticket-${bookingId}`, gateUrl);
}

async function cardPassBuffer(handle: string, cfg: SignerConfig): Promise<Buffer | null> {
  const normalized = handle.trim().replace(/^@+/, "").toLowerCase();
  if (!normalized) return null;
  const profileId = str((await getDocData("handles", normalized))?.profileId);
  if (!profileId) return null;
  const profile = await getDocData("profiles", profileId);
  if (!profile) return null;
  const fields = cardFieldsFromProfile(profile, normalized);
  const passJson = cardPassJson({
    handle: normalized,
    name: fields.name,
    bio: fields.bio,
    city: fields.city,
    kind: fields.kind,
  });
  return buildPassBuffer(cfg, passJson, `card-${normalized}`, `https://airpal.me/@${normalized}`);
}

export const walletPass = onRequest(
  {
    invoker: "public",
    secrets: [passTypeIdSecret, teamIdSecret, signerCertSecret, signerKeySecret, keyPassphraseSecret],
  },
  async (req, res) => {
    if (typeof res.set === "function") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).send("Method not allowed");
      return;
    }
    const match = /\/(ticket|card)\/([^/]+)\.pkpass$/.exec(req.path || "");
    if (!match) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const [, kind, rawKey] = match as unknown as [string, "ticket" | "card", string];
    const key = decodeURIComponent(rawKey);
    const cfg = signerConfig();
    try {
      const buffer =
        kind === "ticket" ? cfg && (await ticketPassBuffer(key, cfg)) : cfg && (await cardPassBuffer(key, cfg));
      // Unknown booking/handle 404s even before checking signer config below;
      // configured-but-missing docs and unconfigured signer both land here.
      if (!buffer) {
        if (!cfg) {
          res.status(501).json({ error: "wallet_not_configured" });
          return;
        }
        res.status(404).json({ error: kind === "ticket" ? "booking_not_found" : "profile_not_found" });
        return;
      }
      res.set("Content-Type", "application/vnd.apple.pkpass");
      res.set("Content-Disposition", `attachment; filename="${kind}-${encodeURIComponent(key)}.pkpass"`);
      res.set("Cache-Control", "private, max-age=300");
      if (req.method === "HEAD") {
        res.set("Content-Length", String(buffer.length));
        res.status(200).send("");
        return;
      }
      res.status(200).send(buffer);
    } catch (err) {
      console.error("walletPass failed:", err);
      res.status(500).json({ error: "wallet_sign_failed" });
    }
  },
);
