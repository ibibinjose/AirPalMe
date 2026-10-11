/* global fetch, URLSearchParams */
/**
 * One-off seed of the Spark Festival 2026 program into Firestore.
 * Session content was transcribed from the public program at
 * https://spark.org.au/festival (September 2026) and curated in
 * scripts/data/spark-festival-2026-sessions.json.
 *
 * Uses the logged-in Firebase CLI OAuth token (never printed).
 * The seeder acts as the festival organiser, so pass the organiser's
 * AirPal uid (Firebase Auth uid, not email):
 *
 *   SPARK_ORGANISER_UID=<uid> node scripts/seed-spark-festival.mjs
 *
 * Idempotent: document ids are stable (spark26-001 …), so re-running
 * overwrites the same docs. The festival goes live immediately.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const PROJECT = "airpalme-app";
const SLUG = "spark-festival-2026";
const NOW = new Date().toISOString();

const FIREBASE_CLI_OAUTH = {
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "jEQXJAhgOVO_N7N5VHFCC-m2",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const sessions = JSON.parse(fs.readFileSync(path.join(here, "data", "spark-festival-2026-sessions.json"), "utf8"));

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
  if (typeof value === "number")
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
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

function docWrite(docPath, data) {
  return {
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/${docPath}`,
      fields: firestoreValue(stripUndefined(data)).mapValue.fields,
    },
  };
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
  const organiserUid = String(process.env.SPARK_ORGANISER_UID || "").trim();
  if (!organiserUid) {
    throw new Error("Set SPARK_ORGANISER_UID to the festival organiser's AirPal uid first.");
  }
  const token = await googleAccessToken();
  const writes = [];

  writes.push(
    docWrite(`festivals/${SLUG}`, {
      slug: SLUG,
      name: "Spark Festival 2026",
      tagline: "Australia's largest grassroots startup festival",
      description:
        "Our startup ecosystem takes over for a week — shaped by the people in it. Spark Festival is back for its eleventh year: a platform for those who can't pay for access, and a week of events across Sydney and NSW.",
      city: "Sydney",
      startDate: "2026-09-21",
      endDate: "2026-09-27",
      timeZone: "Australia/Sydney",
      venueSummary: "Sydney & across NSW",
      organizerName: "Spark Foundation",
      hostYourEventUrl: "https://spark.org.au/be-part-of-spark",
      admissionNote: "Every event is free",
      status: "live",
      createdByUid: organiserUid,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  sessions.forEach((s, i) => {
    const id = `spark26-${String(i + 1).padStart(3, "0")}`;
    // September in Sydney is AEST (+10:00; DST starts in October).
    const startsAt = `${s.date}T${s.start}:00+10:00`;
    const endsAt = `${s.date}T${s.end}:00+10:00`;
    writes.push(
      docWrite(`events/${id}`, {
        id,
        name: s.title,
        flavour: "event_space",
        city: "Sydney",
        venue: s.venue || undefined,
        description: s.description || undefined,
        hostName: s.host || undefined,
        track: s.track || undefined,
        registrationUrl: s.registrationUrl || undefined,
        registrationNote: s.registrationNote || undefined,
        speakers: s.speakers && s.speakers.length ? s.speakers : undefined,
        festivalSlug: SLUG,
        startsAt,
        endsAt,
        status: "live",
        gatePath: `/e/${id}`,
        organiserUid,
        categoryChips: [],
        stallCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
  });

  // One commit holds 500 writes; the program is ~100.
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
  console.log(`Seeded ${SLUG}: festival + ${sessions.length} sessions.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
