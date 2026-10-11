import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  BIRTHDAY_ALERT_DAILY_CAP,
  BIRTHDAY_MATE_CTA,
  buildBirthdayMonthAlert,
  isBirthdayRegionCode,
  shouldAlertBirthdayMidMonth,
  shouldAlertBirthdayMonth,
  sydneyCalendarParts,
  type SetBirthdayAlertPrefsRequest,
} from "../../shared/birthday-freebies";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, requireAccount } from "./admin";
import { fanOut } from "./notifications";

export const setBirthdayAlertPrefs = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "setBirthdayAlertPrefs");
  await enforceRateLimit(uid, "enter", isAnonymousAuth(request));
  const data = (request.data || {}) as SetBirthdayAlertPrefsRequest;
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (data.birthdayAlertsEnabled !== undefined) {
    patch.birthdayAlertsEnabled = data.birthdayAlertsEnabled === true;
  }
  if (data.birthdayAlertsRegion !== undefined) {
    const region = String(data.birthdayAlertsRegion || "")
      .trim()
      .toLowerCase();
    if (!isBirthdayRegionCode(region)) {
      throw new HttpsError("invalid-argument", "Region must be au, in, us, uae, or eu.");
    }
    patch.birthdayAlertsRegion = region;
  }
  if (patch.birthdayAlertsEnabled === undefined && patch.birthdayAlertsRegion === undefined) {
    throw new HttpsError("invalid-argument", "Provide birthdayAlertsEnabled and/or birthdayAlertsRegion.");
  }
  await db.collection("users").doc(uid).set(patch, { merge: true });
  return { ok: true as const };
});

/**
 * Daily (Australia/Sydney): nudge members whose birthday month is now about
 * Birthday Freebies — Life Made Easy / Mate framing.
 */
export const sendBirthdayMonthAlerts = onSchedule(
  {
    region: "us-central1",
    schedule: "0 9 * * *",
    timeZone: "Australia/Sydney",
    timeoutSeconds: 300,
  },
  async () => {
    const now = new Date();
    const { month } = sydneyCalendarParts(now);
    // Oversample so already-alerted users do not starve the daily cap.
    const snap = await db
      .collection("users")
      .where("birthdayMonth", "==", month)
      .limit(Math.min(BIRTHDAY_ALERT_DAILY_CAP * 3, 1500))
      .get();

    let sent = 0;
    for (const doc of snap.docs) {
      if (sent >= BIRTHDAY_ALERT_DAILY_CAP) break;
      const row = doc.data() as Record<string, unknown>;
      const candidate = {
        birthdayMonth: Number(row.birthdayMonth),
        adultConsent: row.adultConsent === true,
        adultConfirmed: row.adultConfirmed === true,
        birthdayAlertsEnabled: row.birthdayAlertsEnabled as boolean | undefined,
        birthdayAlertsRegion: row.birthdayAlertsRegion ? String(row.birthdayAlertsRegion) : "au",
        lastBirthdayMonthAlertAt: row.lastBirthdayMonthAlertAt ? String(row.lastBirthdayMonthAlertAt) : "",
        lastBirthdayMidMonthAlertAt: row.lastBirthdayMidMonthAlertAt ? String(row.lastBirthdayMidMonthAlertAt) : "",
      };

      const sendStart = shouldAlertBirthdayMonth(candidate, now);
      const sendMid = !sendStart && shouldAlertBirthdayMidMonth(candidate, now);
      if (!sendStart && !sendMid) continue;

      const kind = sendStart ? "start" : "mid";
      const msg = buildBirthdayMonthAlert(kind, candidate.birthdayAlertsRegion);
      const body = `${msg.body} ${BIRTHDAY_MATE_CTA.label}.`;
      await fanOut({
        uids: [doc.id],
        kind: "birthday_month",
        title: msg.title,
        body,
        promotionId: "",
        href: msg.href,
      });

      const iso = now.toISOString();
      const stamp: Record<string, unknown> = { updatedAt: iso };
      if (sendStart) stamp.lastBirthdayMonthAlertAt = iso;
      if (sendMid) stamp.lastBirthdayMidMonthAlertAt = iso;
      await doc.ref.set(stamp, { merge: true });
      sent += 1;
    }
  },
);
