/* global fetch, URLSearchParams */
/**
 * One-off backfill: stamp earned Stars tier names onto person profiles.
 *
 * Covers earners whose Stars vested before the server started stamping
 * `starTier` inside `vestReferralStars`. Tier name only — never a balance —
 * and person profiles only (businesses don't earn Stars).
 *
 * Dry run by default (prints planned writes). Pass --apply to write.
 *
 *   node scripts/backfill-star-tiers.mjs            # dry run
 *   node scripts/backfill-star-tiers.mjs --apply    # write
 *
 * Requires `firebase login` first (uses the CLI OAuth token, never printed).
 */

// Must match shared/stars.ts STAR_TIERS. If that file changes, update here.
const STAR_TIERS = [
  { stars: 0, name: "New Mate" },
  { stars: 50, name: "Rising Mate" },
  { stars: 150, name: "Superconnector" },
  { stars: 300, name: "City Legend" },
];

function tierForBalance(balance) {
  let tier = STAR_TIERS[0];
  for (const t of STAR_TIERS) {
    if (balance >= t.stars) tier = t;
  }
  return tier;
}

import fs from "fs";
import os from "os";
import path from "path";

const PROJECT = "airpalme-app";
const APPLY = process.argv.includes("--apply");

const FIREBASE_CLI_OAUTH = {
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "jEQXJAhgOVO_N7N5VHFCC-m2",
};

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

async function listLedger(token) {
  const balances = new Map();
  let pageToken = "";
  for (;;) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)` +
      `/documents/star_ledger?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`list star_ledger failed: ${res.status}`);
    const json = await res.json();
    for (const doc of json.documents || []) {
      const uid = doc.fields?.uid?.stringValue;
      const stars = Number(doc.fields?.stars?.integerValue ?? 0) || 0;
      if (uid) balances.set(uid, (balances.get(uid) || 0) + stars);
    }
    pageToken = json.nextPageToken || "";
    if (!pageToken) break;
  }
  return balances;
}

async function personProfilesFor(token, uid) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "profiles" }],
          where: {
            fieldFilter: { field: { fieldPath: "ownerUid" }, op: "EQUAL", value: { stringValue: uid } },
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`runQuery profiles failed: ${res.status}`);
  const rows = await res.json();
  return (Array.isArray(rows) ? rows : [])
    .map((r) => r.document)
    .filter((d) => d && d?.fields?.kind?.stringValue === "person")
    .map((d) => ({ name: d.name, starTier: d.fields?.starTier?.stringValue || "" }));
}

async function main() {
  const token = await googleAccessToken();
  const balances = await listLedger(token);
  console.log(`Earners in star_ledger: ${balances.size}`);
  const writes = [];
  for (const [uid, balance] of balances) {
    const tierName = tierForBalance(balance).name;
    const profiles = await personProfilesFor(token, uid);
    for (const p of profiles) {
      if (p.starTier === tierName) continue;
      console.log(`${APPLY ? "STAMP" : "WOULD STAMP"} ${p.name.split("/").pop()} uid=${uid} balance=${balance} -> "${tierName}"`);
      writes.push({
        update: {
          name: p.name,
          fields: { starTier: { stringValue: tierName } },
        },
        updateMask: { fieldPaths: ["starTier"] },
      });
    }
  }
  console.log(`${APPLY ? "Applying" : "Planned"} ${writes.length} profile update(s).`);
  if (!APPLY || writes.length === 0) {
    if (!APPLY) console.log("Dry run — re-run with --apply to write.");
    return;
  }
  for (let i = 0; i < writes.length; i += 100) {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ writes: writes.slice(i, i + 100) }),
      },
    );
    if (!res.ok) throw new Error(`commit failed: ${res.status} ${await res.text()}`);
  }
  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
