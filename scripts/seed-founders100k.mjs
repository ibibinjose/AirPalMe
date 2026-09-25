/* global fetch, URLSearchParams */
/**
 * One-off seed of the "Founders 100K" launch giveaway into Firestore.
 * Campaign content lives in scripts/data/founders100k-2026.json.
 *
 * Uses the logged-in Firebase CLI OAuth token (never printed).
 * The seeder acts as the campaign owner, so pass a platform admin's
 * AirPal uid (Firebase Auth uid, not email):
 *
 *   AIRPAL_ADMIN_UID=<uid> node scripts/seed-founders100k.mjs
 *
 * Idempotent: the document id is stable (founders-100k), so re-running
 * overwrites the same doc. The campaign seeds as `draft` with legal review
 * `pending` — chance-based mechanics can only go live after human legal
 * review, enforced server-side. Publish path after review:
 * Admin → Promotions → founders-100k → Approve → Publish.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const PROJECT = "airpalme-app";
const DOC_ID = "founders-100k";
const NOW = new Date().toISOString();

const FIREBASE_CLI_OAUTH = {
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "jEQXJAhgOVO_N7N5VHFCC-m2",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const campaign = JSON.parse(fs.readFileSync(path.join(here, "data", "founders100k-2026.json"), "utf8"));

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) fields[k] = firestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function googleAccessToken() {
  const cfgPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const tokens = cfg?.tokens || {};
  if (tokens.access_token && Number(tokens.expires_at) > Date.now() + 60_000) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) {
    throw new Error("No Firebase CLI refresh token. Run `firebase login` first.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: FIREBASE_CLI_OAUTH.client_id,
      client_secret: FIREBASE_CLI_OAUTH.client_secret,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Could not refresh Google access token.");
  return json.access_token;
}

async function main() {
  const adminUid = String(process.env.AIRPAL_ADMIN_UID || "").trim();
  if (!adminUid) {
    throw new Error("Set AIRPAL_ADMIN_UID to a platform admin's AirPal uid first.");
  }
  const token = await googleAccessToken();
  const doc = {
    ...campaign,
    sponsorId: adminUid,
    entriesCount: 0,
    viewsCount: 0,
    clicksCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: adminUid,
    ownerUid: adminUid,
  };
  const writes = [
    {
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/promotions/${DOC_ID}`,
        fields: firestoreValue(stripUndefined(doc)).mapValue.fields,
      },
    },
  ];
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore commit failed (${res.status}): ${body.slice(0, 500)}`);
  }
  console.log(`Seeded promotions/${DOC_ID} as draft (legal review pending).`);
  console.log("To launch: legal review → Admin / Promotions → founders-100k → Approve → Publish.");
  console.log("Landing page: /founders · Giveaway page: /giveaways/founders-100k once live.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
