import { Capacitor } from "@capacitor/core";

/**
 * Platform detection without native side-effects. Lives apart from
 * `native.ts` so lower-level modules (e.g. notifications) can ask "are we
 * in the app shell?" without creating an import cycle.
 */

/** True inside a Capacitor native iOS or Android shell. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Platform name: 'ios', 'android', or 'web'. */
export function getNativePlatform(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}
