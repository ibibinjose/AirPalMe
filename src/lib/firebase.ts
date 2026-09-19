import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import type { Analytics } from "firebase/analytics";
import { FUNCTIONS_REGION } from "@shared/airpal-security";

const appletConfig: Record<string, string> =
  typeof __FIREBASE_APPLET_CONFIG__ !== "undefined" && __FIREBASE_APPLET_CONFIG__ ? __FIREBASE_APPLET_CONFIG__ : {};

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || appletConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || appletConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || appletConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || appletConfig.storageBucket,
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || appletConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || appletConfig.appId,
  measurementId:
    ((import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_GA_MEASUREMENT_ID) as string | undefined) ||
    appletConfig.measurementId ||
    undefined,
};

export function getMeasurementId(): string | undefined {
  return (
    (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) ||
    (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ||
    firebaseConfig.measurementId
  );
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/** Browser API key is public (same value as the web app). Used by phone+password Cloud Function. */
export function firebaseWebApiKey(): string {
  return String(firebaseConfig.apiKey || "").trim();
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;
let analytics: Analytics | null = null;

const emulators = {
  auth: false,
  firestore: false,
  functions: false,
  storage: false,
};

function shouldUseEmulators(): boolean {
  return import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
}

let appCheckReady = false;

// Loaded on demand: App Check (reCAPTCHA) is not needed for first paint.
async function connectAppCheck(firebaseApp: FirebaseApp) {
  if (appCheckReady || typeof window === "undefined") return;
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) return;
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
    if (import.meta.env.DEV) {
      const debug = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
      Object.assign(self, { FIREBASE_APPCHECK_DEBUG_TOKEN: debug || true });
    }
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckReady = true;
  } catch {
    /* app check unavailable; callables still work when unenforced */
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  void connectAppCheck(app);
  return app;
}

export function setFirebaseAuthForTesting(mockAuth: Auth | null): void {
  auth = mockAuth;
}

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  auth = getAuth(firebaseApp);
  if (shouldUseEmulators() && !emulators.auth) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    emulators.auth = true;
  }
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) {
    db = getFirestore(firebaseApp);
    if (shouldUseEmulators() && !emulators.firestore) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      emulators.firestore = true;
    }
  }
  return db;
}

export function getFirebaseFunctions(): Functions | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!functions) {
    functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
    if (shouldUseEmulators() && !emulators.functions) {
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      emulators.functions = true;
    }
  }
  return functions;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) {
    storage = getStorage(firebaseApp);
    if (shouldUseEmulators() && !emulators.storage) {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      emulators.storage = true;
    }
  }
  return storage;
}

export function analyticsEnvironment(): "development" | "staging" | "production" {
  const explicit = String(import.meta.env.VITE_AIRPAL_ENV || "").toLowerCase();
  if (explicit === "production" || explicit === "staging" || explicit === "development") return explicit;
  return import.meta.env.PROD ? "production" : "development";
}

export function analyticsEnabled(): boolean {
  return Boolean(isFirebaseConfigured && firebaseConfig.measurementId && typeof window !== "undefined");
}

export function setFirebaseAnalyticsForTesting(mock: Analytics | null): void {
  analytics = mock;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!analyticsEnabled()) return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (analytics) return analytics;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(firebaseApp);
    }
  } catch {
    /* analytics not supported in this environment */
  }
  return analytics;
}

let anonAuthPromise: Promise<string | null> | null = null;
let anonCooldownUntil = 0;

export function resetAnonymousSessionStateForTesting(): void {
  anonAuthPromise = null;
  anonCooldownUntil = 0;
  auth = null;
}

export async function ensureAnonymousSession(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return null;
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser.uid;
  if (Date.now() < anonCooldownUntil) return null;

  if (anonAuthPromise) return anonAuthPromise;

  anonAuthPromise = (async () => {
    try {
      if (typeof firebaseAuth.authStateReady === "function") {
        await firebaseAuth.authStateReady();
      }
      if (firebaseAuth.currentUser) return firebaseAuth.currentUser.uid;
      if (Date.now() < anonCooldownUntil) return null;

      const credential = await signInAnonymously(firebaseAuth);
      return credential.user.uid;
    } catch {
      // Back off on error or rate-limiting (e.g. TOO_MANY_ATTEMPTS_TRY_LATER)
      anonCooldownUntil = Date.now() + 30_000;
      return null;
    } finally {
      anonAuthPromise = null;
    }
  })();

  return anonAuthPromise;
}
