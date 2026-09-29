import { httpsCallable } from "firebase/functions";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { CreateBroadcastRequest, ReviewBroadcastRequest } from "@shared/notifications";
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from "./firebase";
import { isNativeApp } from "./platform";

async function callNotify<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function createBroadcastRemote(data: CreateBroadcastRequest) {
  return callNotify<CreateBroadcastRequest, { ok: boolean; broadcastId: string; status?: string; sent?: number }>(
    "createBroadcast",
    data,
  );
}

export function reviewBroadcastRemote(data: ReviewBroadcastRequest) {
  return callNotify<ReviewBroadcastRequest, { ok: boolean; status: string; sent?: number }>("reviewBroadcast", data);
}

const PREF_KEY = "airpal.notify.push";

export function pushPrefEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function setPushPref(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

function vapidKey(): string {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
}

function tokenDocId(token: string): string {
  return token.slice(-32).replace(/[^a-zA-Z0-9]/g, "") || "web";
}

async function saveToken(token: string, platform: string) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth?.currentUser || !db || !token) return;
  await setDoc(doc(db, "users", auth.currentUser.uid, "fcmTokens", tokenDocId(token)), {
    token,
    platform,
    updatedAt: serverTimestamp(),
  });
}

/** Web push via FCM. Returns the permission state. */
export async function enableWebPush(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  if (isNativeApp()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setPushPref(false);
    return permission === "denied" ? "denied" : "unsupported";
  }
  setPushPref(true);
  try {
    const app = getFirebaseApp();
    const key = vapidKey();
    if (!app || !key || !(await isSupported())) return "granted";
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: key });
    if (token) await saveToken(token, "web");
  } catch {
    /* permission granted; token can retry later */
  }
  return "granted";
}

/** Foreground web pushes arrive here while the app is open. */
export function listenForegroundPush(handler: (title: string, body: string) => void): () => void {
  let off: (() => void) | undefined;
  void (async () => {
    try {
      const app = getFirebaseApp();
      if (!app || !(await isSupported())) return;
      off = onMessage(getMessaging(app), (payload) => {
        handler(payload.notification?.title || "AirPal.Me", payload.notification?.body || "");
      });
    } catch {
      /* ignore */
    }
  })();
  return () => off?.();
}

/**
 * Native push (iOS/Android). Requires @capacitor/push-notifications to be
 * installed (`npm i` on your machine, then `npx cap sync`). Safe no-op until then.
 */
const NATIVE_PUSH_PLUGIN = "@capacitor/push-notifications";

export async function registerNativePush(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const mod = await import(/* @vite-ignore */ NATIVE_PUSH_PLUGIN);
    const PushNotifications = mod.PushNotifications;
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== "granted") return;
    }
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token: { value: string }) => {
      void saveToken(token.value, "native");
    });
    PushNotifications.addListener("registrationError", () => undefined);
    setPushPref(true);
  } catch {
    /* plugin not installed yet — web inbox still works */
  }
}

const SHOWN_KEY = "airpal.notify.shown";

export function shownPopupIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markPopupShown(id: string) {
  try {
    const shown = shownPopupIds();
    shown.add(id);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(shown).slice(-50)));
  } catch {
    /* ignore */
  }
}

export async function markNotificationRead(id: string) {
  const db = getFirebaseDb();
  if (!db || !id) return;
  try {
    await updateDoc(doc(db, "promotion_notifications", id), { read: true });
  } catch {
    /* offline or already read */
  }
}

/** Bulk mark-read for inbox segments. Each write is idempotent; failures stay unread. */
export async function markAllNotificationsRead(ids: string[]) {
  await Promise.all(ids.map((id) => markNotificationRead(id)));
}
