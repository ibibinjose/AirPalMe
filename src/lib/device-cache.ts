/**
 * Device cache hygiene: signing out must never leak the previous account's
 * name, avatar, plans, saves, people, or memories into the next session.
 *
 * Strategy: sweep every `airpal`/`airpal:` storage key EXCEPT device-level
 * preferences (door, notification prefs, location choice, power-save,
 * analytics + consent). Firebase's own keys (`firebase:...`) are untouched.
 */

import { safeLocalStorage, safeSessionStorage } from "./safe-storage";

const PREFIXES = ["airpal.", "airpal:"];

/** Device prefs that survive logout. Everything else `airpal*` is user data. */
const KEEP = [
  "airpal.door.v1",
  "airpal.notify.push",
  "airpal.notify.shown",
  "airpal.location.v1",
  "airpal.location.share",
  "airpal.location.lastGps",
  "airpal.power_save.mode",
  "airpal.host.ticketPush",
  "airpal.analytics.session",
  "airpal.analytics.visitor",
  "airpal.analytics.consent",
  "airpal.analytics.queue.v2",
  "airpal.analytics.from-scan",
  "airpal.analytics.internal",
  "airpal.analytics.session-started",
  "airpal.analytics.session-started-at",
  "airpal:invite-ref:v1",
];

const MEDIA_DB = "airpal-media";

function sweep(storage: Storage | null): string[] {
  if (!storage) return [];
  const removed: string[] = [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k) keys.push(k);
  }
  for (const k of keys) {
    if (PREFIXES.some((p) => k.startsWith(p)) && !KEEP.includes(k)) {
      storage.removeItem(k);
      removed.push(k);
    }
  }
  return removed;
}

/** Remove all signed-in user data from this device. Safe to call twice. */
export function clearDeviceCache(): string[] {
  const removed = [...sweep(safeLocalStorage()), ...sweep(safeSessionStorage())];
  try {
    if (typeof indexedDB !== "undefined" && indexedDB.deleteDatabase) {
      indexedDB.deleteDatabase(MEDIA_DB);
    }
  } catch {
    /* private mode: nothing to drop */
  }
  return removed;
}
