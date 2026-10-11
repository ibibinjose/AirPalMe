import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebase";

async function callBirthday<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function friendlyBirthdayError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || "";
  const message = err instanceof Error ? err.message : "";
  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "You do not have permission for that action.";
  }
  if (code === "functions/unauthenticated" || code === "unauthenticated") {
    return "Sign in to continue.";
  }
  if (code === "functions/invalid-argument" || code === "invalid-argument") {
    return message || "Check the details and try again.";
  }
  return message || "Something went wrong. Please try again.";
}

export function setBirthdayAlertPrefsRemote(data: { birthdayAlertsEnabled?: boolean; birthdayAlertsRegion?: string }) {
  return callBirthday<{ birthdayAlertsEnabled?: boolean; birthdayAlertsRegion?: string }, { ok: boolean }>(
    "setBirthdayAlertPrefs",
    data,
  );
}
