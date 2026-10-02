import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  GUESTLIST_CONSENT_V1,
  guestlistSignupId,
  normalizeSignupEmail,
  validateGuestlistSignup,
} from "../../shared/airpal-guestlist";
import type {
  AccessClaims,
  JoinGuestlistSignupRequest,
  JoinGuestlistSignupResponse,
  ListGuestlistSignupsRequest,
  ListGuestlistSignupsResponse,
  UnsubscribeGuestlistRequest,
  UnsubscribeGuestlistResponse,
} from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";

/**
 * AirPal Guestlist (marketing signups: Name, City, Email + interests).
 * Guests join from bio pages — anonymous auth OK, rate-limited. Rows live
 * in `guestlist_signups` keyed by normalized email, callable-only, with
 * consent captured per submit. Admins list/export; sending campaigns
 * needs a real ESP sender (brand keys, follow-up).
 */

const COLLECTION = "guestlist_signups";

export const joinGuestlistSignup = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "joinGuestlistSignup");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "guestlistSignup", isAnonymousAuth(request));

  const data = (request.data || {}) as JoinGuestlistSignupRequest;
  const problems = validateGuestlistSignup(data);
  if (problems.length > 0) {
    throw new HttpsError("invalid-argument", problems[0] || "Invalid signup.");
  }
  const email = normalizeSignupEmail(String(data.email));
  const ref = db.collection(COLLECTION).doc(guestlistSignupId(email));
  const existing = await ref.get();
  const now = new Date().toISOString();
  const previous = (existing.data() || {}) as Record<string, unknown>;
  await ref.set(
    {
      email,
      name: String(data.name).trim().slice(0, 80),
      city: String(data.city).trim().slice(0, 60),
      interests: (data.interests || []).slice(0, 4),
      invites: true,
      source: typeof data.source === "string" ? data.source.slice(0, 60) : "",
      consentAt: now,
      consentText: GUESTLIST_CONSENT_V1,
      unsubscribedAt: null,
      createdAt: typeof previous.createdAt === "string" ? previous.createdAt : now,
      updatedAt: now,
    },
    { merge: true },
  );
  const done: JoinGuestlistSignupResponse = { ok: true, email };
  return done;
});

export const listGuestlistSignups = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "listGuestlistSignups");
  const uid = requireAccount(request, "Sign in to view signups.");
  if (!isPlatformAdmin(request.auth?.token as AccessClaims | undefined)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  await enforceRateLimit(uid, "guestlistSignup", false);

  const data = (request.data || {}) as ListGuestlistSignupsRequest;
  const limit = Math.min(500, Math.max(1, Number(data.limit) || 100));
  const city = typeof data.city === "string" ? data.city.trim().toLowerCase() : "";
  const interest = typeof data.interest === "string" ? data.interest.trim() : "";
  const startAfter = typeof data.startAfter === "string" ? data.startAfter : "";

  // Small early-access list: one capped scan, filtered in code — no
  // composite indexes to provision before the audience exists.
  const snap = await db.collection(COLLECTION).limit(2000).get();
  const rows = snap.docs
    .map((row) => {
      const d = (row.data() || {}) as Record<string, unknown>;
      return {
        email: String(d.email || row.id),
        name: String(d.name || ""),
        city: String(d.city || ""),
        interests: Array.isArray(d.interests) ? d.interests.filter((v): v is string => typeof v === "string") : [],
        source: String(d.source || ""),
        consentAt: String(d.consentAt || ""),
        createdAt: String(d.createdAt || ""),
        unsubscribedAt: typeof d.unsubscribedAt === "string" ? d.unsubscribedAt : null,
      };
    })
    .filter((r) => !r.unsubscribedAt)
    .filter((r) => !city || r.city.toLowerCase() === city)
    .filter((r) => !interest || r.interests.includes(interest))
    .sort((a, b) => a.email.localeCompare(b.email));
  const start = startAfter ? rows.findIndex((r) => r.email === startAfter) + 1 : 0;
  const page = rows.slice(Math.max(0, start), Math.max(0, start) + limit);
  const done: ListGuestlistSignupsResponse = {
    rows: page,
    hasMore: Math.max(0, start) + limit < rows.length,
    total: rows.length,
  };
  return done;
});

export const unsubscribeGuestlist = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "unsubscribeGuestlist");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "guestlistSignup", isAnonymousAuth(request));

  const data = (request.data || {}) as UnsubscribeGuestlistRequest;
  const email = normalizeSignupEmail(String(data.email || ""));
  // Always OK, even for unknown addresses: no membership oracle.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    const done: UnsubscribeGuestlistResponse = { ok: true };
    return done;
  }
  const ref = db.collection(COLLECTION).doc(guestlistSignupId(email));
  const existing = await ref.get();
  if (existing.exists) {
    await ref.set({ unsubscribedAt: new Date().toISOString() }, { merge: true });
  }
  const done: UnsubscribeGuestlistResponse = { ok: true };
  return done;
});
