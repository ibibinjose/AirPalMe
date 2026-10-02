import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const firestore = readFileSync(resolve(root, "firestore.rules"), "utf8");
const storage = readFileSync(resolve(root, "storage.rules"), "utf8");
const indexes = readFileSync(resolve(root, "firestore.indexes.json"), "utf8");

const problems = [];

function must(ok, message) {
  if (!ok) problems.push(message);
}

must(firestore.startsWith("rules_version = '2'"), "firestore.rules must declare rules_version 2");
must(storage.startsWith("rules_version = '2'"), "storage.rules must declare rules_version 2");
must(firestore.includes("function isAnonymous()"), "firestore.rules must treat anonymous users separately");
must(firestore.includes("match /analyticsEvents/{eventId}"), "firestore.rules must declare analyticsEvents");
must(firestore.includes("match /analyticsDaily/{docId}"), "firestore.rules must declare analyticsDaily aggregates");
must(firestore.includes("match /rateLimits/{docId}"), "firestore.rules must lock rateLimits to functions");
must(firestore.includes("match /abuseSignals/{docId}"), "firestore.rules must lock abuseSignals to functions");
must(
  firestore.includes("match /guestlist_signups/{signupId}"),
  "firestore.rules must lock guestlist_signups to functions",
);
must(firestore.includes("match /contentAudits/{docId}"), "firestore.rules must lock contentAudits to functions");
must(firestore.includes("!isAnonymous()"), "listings/events creates must reject anonymous writers");
must(firestore.includes("request.resource.data.uid == request.auth.uid"), "guest writes must bind uid");
must(firestore.includes("match /guestlist/{entryId}"), "firestore.rules must declare the event guestlist");
must(firestore.includes("function eventHosts(eventId)"), "firestore.rules must define the event door team");
must(firestore.includes("function planHosts(planId)"), "firestore.rules must define the plan door team");
must(
  firestore.includes("match /plans/{planId}") && firestore.includes("planHosts(planId)"),
  "firestore.rules must declare the plan guestlist",
);
must(
  firestore.includes("resource.data.uid == request.auth.uid") && firestore.includes("match /guestlist/{entryId}"),
  "guestlist reads must stay host-only with own-row guest access",
);
must(firestore.includes("details.size() < 2000"), "tickets must cap details length");
must(indexes.includes("analyticsDaily"), "firestore.indexes.json must index analyticsDaily");

must(existsSync(resolve(root, "storage.rules")), "storage.rules missing");
must(existsSync(resolve(root, "firebase.json")), "firebase.json missing");

if (problems.length) {
  console.error("Firebase rules check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Firebase rules check passed.");
