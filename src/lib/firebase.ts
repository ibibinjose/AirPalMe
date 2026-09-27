import { Capacitor } from "@capacitor/core";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
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
    const { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
    if (import.meta.env.DEV) {
      const debug = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
      Object.assign(self, { FIREBASE_APPCHECK_DEBUG_TOKEN: debug || true });
    }
    const isEnterprise = import.meta.env.VITE_FIREBASE_APPCHECK_ENTERPRISE === "true";
    const provider = isEnterprise ? new ReCaptchaEnterpriseProvider(siteKey) : new ReCaptchaV3Provider(siteKey);
    initializeAppCheck(firebaseApp, {
      provider,
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
  if (Capacitor.isNativePlatform()) {
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      auth = getAuth(firebaseApp);
    }
  } else {
    auth = getAuth(firebaseApp);
  }
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
    if (typeof window !== "undefined") {
      try {
        db = initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        db = getFirestore(firebaseApp);
      }
    } else {
      db = getFirestore(firebaseApp);
    }
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
let authUpgradeDepth = 0;

function signedInUid(firebaseAuth: Auth | null): string | null {
  const user = firebaseAuth?.currentUser;
  if (!user) return null;
  return user.uid;
}

function hasRealAccount(firebaseAuth: Auth | null): boolean {
  const user = firebaseAuth?.currentUser;
  return Boolean(user && !user.isAnonymous);
}

export function hasRealFirebaseUser(): boolean {
  return hasRealAccount(getFirebaseAuth());
}

/** Call around email/phone/password sign-in so a guest anonymous session cannot replace it. */
export function beginAuthUpgrade(): void {
  authUpgradeDepth += 1;
}

export function endAuthUpgrade(): void {
  authUpgradeDepth = Math.max(0, authUpgradeDepth - 1);
}

export function isAuthUpgradeInProgress(): boolean {
  return authUpgradeDepth > 0;
}

export async function awaitPendingAnonymousSession(): Promise<void> {
  if (anonAuthPromise) await anonAuthPromise.catch(() => {});
}

export async function withAuthUpgrade<T>(run: () => Promise<T>): Promise<T> {
  beginAuthUpgrade();
  try {
    await awaitPendingAnonymousSession();
    return await run();
  } finally {
    endAuthUpgrade();
  }
}

export function resetAnonymousSessionStateForTesting(): void {
  anonAuthPromise = null;
  anonCooldownUntil = 0;
  authUpgradeDepth = 0;
  auth = null;
}

export async function ensureAnonymousSession(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return null;
  if (hasRealAccount(firebaseAuth) || firebaseAuth.currentUser) return signedInUid(firebaseAuth);
  if (authUpgradeDepth > 0) return signedInUid(firebaseAuth);
  if (Date.now() < anonCooldownUntil) return null;

  if (anonAuthPromise) return anonAuthPromise;

  anonAuthPromise = (async () => {
    try {
      if (typeof firebaseAuth.authStateReady === "function") {
        await firebaseAuth.authStateReady();
      }
      if (hasRealAccount(firebaseAuth) || firebaseAuth.currentUser) return signedInUid(firebaseAuth);
      if (authUpgradeDepth > 0) return signedInUid(firebaseAuth);
      if (Date.now() < anonCooldownUntil) return null;

      const credential = await signInAnonymously(firebaseAuth);
      if (hasRealAccount(firebaseAuth)) return signedInUid(firebaseAuth);
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
