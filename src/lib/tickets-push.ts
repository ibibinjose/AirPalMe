import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb } from "./firebase";

const PREF_KEY = "airpal.host.ticketPush";

export function ticketPushPrefEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function setPref(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

function vapidKey() {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
}

function tokenDocId(token: string) {
  return token.slice(-32).replace(/[^a-zA-Z0-9]/g, "") || "web";
}

export async function notifyHostForeground(title: string, body: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag: "airpal-ticket" });
    n.onclick = () => {
      window.focus();
      n.close();
      window.location.assign("/host");
    };
  } catch {
    /* Safari private mode etc. */
  }
}

/** Ask for alerts. Works with the Notification API even without an FCM VAPID key. */
export async function enableHostTicketPush(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setPref(false);
    return permission === "denied" ? "denied" : "unsupported";
  }
  setPref(true);
  await registerHostFcmToken();
  return "granted";
}

export async function disableHostTicketPush() {
  setPref(false);
  const app = getFirebaseApp();
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const key = vapidKey();
  if (!app || !auth?.currentUser || !db || !key) return;
  try {
    if (!(await isSupported())) return;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: key });
    if (token) {
      await deleteToken(messaging);
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "fcmTokens", tokenDocId(token)));
    }
  } catch {
    /* ignore */
  }
}

export async function registerHostFcmToken() {
  const app = getFirebaseApp();
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const key = vapidKey();
  if (!app || !auth?.currentUser || !db || !key) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    if (!(await isSupported())) return;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: key });
    if (!token) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "fcmTokens", tokenDocId(token)), {
      token,
      platform: "web",
      updatedAt: serverTimestamp(),
    });
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "Guest request";
      const body = payload.notification?.body || "";
      void notifyHostForeground(title, body);
    });
  } catch {
    /* VAPID missing or blocked — foreground snapshot still works */
  }
}
