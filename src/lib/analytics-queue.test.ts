import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.clear) {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}

vi.mock("firebase/auth", () => {
  return {
    signInAnonymously: vi.fn(),
    getAuth: vi.fn(),
    initializeAuth: vi.fn(),
    connectAuthEmulator: vi.fn(),
    indexedDBLocalPersistence: {},
    browserLocalPersistence: {},
  };
});

vi.mock("./functions", () => {
  return {
    liveBackendEnabled: vi.fn(() => true),
    recordAnalyticsBatchRemote: vi.fn(async () => ({ acceptedIds: [] })),
  };
});

import { signInAnonymously } from "firebase/auth";
import {
  beginAuthUpgrade,
  endAuthUpgrade,
  ensureAnonymousSession,
  resetAnonymousSessionStateForTesting,
  setFirebaseAuthForTesting,
} from "./firebase";
import { flushAnalyticsQueue, track, setAnalyticsConsent } from "./analytics";
import { recordAnalyticsBatchRemote } from "./functions";

describe("Firebase Anonymous Session & Analytics Queue", () => {
  const fakeAuth = {
    currentUser: null,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetAnonymousSessionStateForTesting();
    setFirebaseAuthForTesting(fakeAuth);
    setAnalyticsConsent("analytics");
    fakeAuth.currentUser = null;
  });

  it("shares in-flight promise across concurrent callers", async () => {
    let resolveAuth: (val: unknown) => void;
    const authPromise = new Promise((res) => {
      resolveAuth = res;
    });

    vi.mocked(signInAnonymously).mockReturnValue(authPromise as any);

    const call1 = ensureAnonymousSession();
    const call2 = ensureAnonymousSession();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    resolveAuth!({ user: { uid: "anon-shared-123" } });

    const [uid1, uid2] = await Promise.all([call1, call2]);
    expect(uid1).toBe("anon-shared-123");
    expect(uid2).toBe("anon-shared-123");
  });

  it("backs off on rate-limit/error without hammering signInAnonymously", async () => {
    vi.mocked(signInAnonymously).mockRejectedValueOnce(new Error("TOO_MANY_ATTEMPTS_TRY_LATER"));

    const uid1 = await ensureAnonymousSession();
    expect(uid1).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    // Immediate second call should be suppressed by cooldown
    const uid2 = await ensureAnonymousSession();
    expect(uid2).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("stops retrying anonymous sign-in when the provider is disabled for the project", async () => {
    vi.mocked(signInAnonymously).mockRejectedValueOnce(
      Object.assign(new Error("Firebase: Error (auth/admin-restricted-operation)."), {
        code: "auth/admin-restricted-operation",
      }),
    );

    expect(await ensureAnonymousSession()).toBeNull();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 10 * 60_000);
      expect(await ensureAnonymousSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("gracefully queues events as offline without triggering 401 when anonymous session is unavailable", async () => {
    vi.mocked(signInAnonymously).mockRejectedValue(new Error("Network offline"));

    // Track an event
    track({
      eventName: "screen_view",
      contextType: "system",
      properties: { screen: "test" },
    });

    await flushAnalyticsQueue();

    // Remote batch must NOT be called without authenticated UID (avoids HTTP 401)
    expect(recordAnalyticsBatchRemote).not.toHaveBeenCalled();
  });

  it("reuses restored session from authStateReady without calling signInAnonymously", async () => {
    fakeAuth.authStateReady = vi.fn(async () => {
      fakeAuth.currentUser = { uid: "restored-user-456" };
    });

    const uid = await ensureAnonymousSession();
    expect(uid).toBe("restored-user-456");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("does not start an anonymous session while a real sign-in is in progress", async () => {
    beginAuthUpgrade();
    const uid = await ensureAnonymousSession();
    endAuthUpgrade();
    expect(uid).toBeNull();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("keeps a real account and skips signInAnonymously", async () => {
    fakeAuth.currentUser = { uid: "email-user", isAnonymous: false };
    const uid = await ensureAnonymousSession();
    expect(uid).toBe("email-user");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("does not replace a real user if they sign in during authStateReady", async () => {
    fakeAuth.authStateReady = vi.fn(async () => {
      fakeAuth.currentUser = { uid: "email-user", isAnonymous: false };
    });
    vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: "anon-should-not-win" } } as any);

    const uid = await ensureAnonymousSession();
    expect(uid).toBe("email-user");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
