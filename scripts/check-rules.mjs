import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const firestore = readFileSync(resolve(root, "firestore.rules"), "utf8");
const storage = readFileSync(resolve(root, "storage.rules"), "utf8");
const indexes = readFileSync(resolve(root, "firestore.indexes.json"), "utf8");

const problems = [];

function must(ok, message) {
  if (!ok) problems.push(message);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if ((full.endsWith(".ts") || full.endsWith(".tsx")) && !full.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
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

// Compound-query index coverage: a client query combining where() with
// orderBy() needs a composite index or Firestore throws failed-precondition
// at runtime (the user sees a load failure, not an empty list).
{
  const defined = JSON.parse(indexes).indexes || [];
  const covers = (group, whereField, arrayOp, orderField, orderDir) =>
    defined.some(
      (entry) =>
        entry.collectionGroup === group &&
        entry.fields.length >= 2 &&
        entry.fields[0].fieldPath === whereField &&
        (arrayOp ? entry.fields[0].arrayConfig === "CONTAINS" : "order" in entry.fields[0]) &&
        entry.fields[1].fieldPath === orderField &&
        entry.fields[1].order === orderDir,
    );
  for (const file of walk(resolve(root, "src"))) {
    const text = readFileSync(file, "utf8");
    const orderRe = /orderBy\("([^"]+)",\s*"(asc|desc)"\)/g;
    let match;
    while ((match = orderRe.exec(text))) {
      const [, orderField, dir] = match;
      const before = text.slice(Math.max(0, match.index - 800), match.index);
      const collAt = before.lastIndexOf("collection(");
      if (collAt < 0) continue;
      const collArgs = before.slice(collAt).match(/collection\([^)]*\)/s);
      const strings = [...(collArgs ? collArgs[0].matchAll(/"([^"]+)"/g) : [])].map((m) => m[1]);
      if (!strings.length) continue;
      const group = strings[strings.length - 1]; // subcollection id when nested
      const whereAt = before.lastIndexOf('where("');
      if (whereAt < collAt) continue; // single-field orderBy: auto-indexed
      const whereMatch = before.slice(whereAt).match(/where\("([^"]+)",\s*"([^"]+)"/);
      if (!whereMatch) continue;
      const [, whereField, op] = whereMatch;
      const arrayOp = op === "array-contains" || op === "array-contains-any";
      const orderDir = dir === "desc" ? "DESCENDING" : "ASCENDING";
      must(
        covers(group, whereField, arrayOp, orderField, orderDir),
        `${file.replace(root + "/", "")}: query on "${group}" needs composite index (${whereField}, ${orderField} ${orderDir}) in firestore.indexes.json`,
      );
    }
  }
}

// Multiple equality filters on different fields also need a composite index
// (single-field indexes never combine). Same silent failed-precondition.
{
  const defined = JSON.parse(indexes).indexes || [];
  const coversPair = (group, first, second) =>
    defined.some(
      (entry) =>
        entry.collectionGroup === group &&
        entry.fields.length >= 2 &&
        entry.fields[0].fieldPath === first &&
        "order" in entry.fields[0] &&
        entry.fields[1].fieldPath === second &&
        "order" in entry.fields[1],
    );
  const scan = (dir, admin) => {
    for (const file of walk(dir)) {
      const text = readFileSync(file, "utf8");
      // Adjacent where() pairs: query(..., where(A), where(B)) or ref.where(A).where(B).
      const pairRe = admin
        ? /\.where\("([^"]+)",\s*"=="[^)]*\)\.where\("([^"]+)",\s*"==""/g
        : /where\("([^"]+)",\s*"=="[^)]*?\)\s*,\s*where\("([^"]+)",\s*"=="/g;
      let match;
      while ((match = pairRe.exec(text))) {
        const [, first, second] = match;
        if (first === second) continue;
        const before = text.slice(Math.max(0, match.index - 800), match.index);
        const collAt = admin ? before.lastIndexOf('.collection("') : before.lastIndexOf("collection(");
        if (collAt < 0) continue;
        const strings = [...before.slice(collAt, collAt + 200).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
        if (!strings.length) continue;
        const group = admin ? strings[0] : strings[strings.length - 1];
        must(
          coversPair(group, first, second),
          `${file.replace(root + "/", "")}: query on "${group}" needs composite index (${first}, ${second}) in firestore.indexes.json`,
        );
      }
    }
  };
  scan(resolve(root, "src"), false);
  scan(resolve(root, "functions", "src"), true);
}

if (problems.length) {
  console.error("Firebase rules check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Firebase rules check passed.");
