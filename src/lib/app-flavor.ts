/**
 * Native app flavor: AirPal vs AirPal Pass shells.
 *
 * One web bundle serves both native apps plus web. The flavor resolves at
 * boot (main.tsx awaits initAppFlavor before render): an explicit
 * VITE_APP_FLAVOR override wins, native shells resolve from their app id,
 * and web defaults to the full AirPal app (no web gating).
 *
 * This module keeps zero static Capacitor imports so unit tests can import
 * the pure core in a node environment; native reads are dynamic + guarded.
 */

export type AppFlavor = "airpal" | "pass";

export const AIRPAL_APP_ID = "me.airpal.app";
export const PASS_APP_ID = "me.airpal.pass";

export const FLAVOR_START_ROUTE: Record<AppFlavor, string> = {
  airpal: "/",
  pass: "/pass",
};

/** Parse a raw flavor value (env override). Unknown/empty → null (no override). */
export function parseAppFlavor(value: unknown): AppFlavor | null {
  return value === "airpal" || value === "pass" ? value : null;
}

export interface FlavorContext {
  envFlavor: AppFlavor | null;
  platform: "ios" | "android" | "web";
  appId: string | null;
}

/**
 * Pure flavor resolution. Override wins; native Pass shell resolves from its
 * app id; everything else (web, unknown shells) gets the full AirPal app.
 */
export function resolveAppFlavor(ctx: FlavorContext): AppFlavor {
  if (ctx.envFlavor) return ctx.envFlavor;
  if (ctx.platform !== "web" && ctx.appId === PASS_APP_ID) return "pass";
  return "airpal";
}

async function readNativeIdentity(): Promise<{ platform: FlavorContext["platform"]; appId: string | null }> {
  try {
    const [{ Capacitor }, { App }] = await Promise.all([import("@capacitor/core"), import("@capacitor/app")]);
    const raw = Capacitor.getPlatform?.() ?? "web";
    const platform = raw === "ios" || raw === "android" ? raw : "web";
    let appId: string | null = null;
    if (platform !== "web") {
      try {
        appId = (await App.getInfo())?.id ?? null;
      } catch {
        appId = null;
      }
    }
    return { platform, appId };
  } catch {
    return { platform: "web", appId: null };
  }
}

let cached: AppFlavor | null = null;

/** Resolve once at boot. Cached after; safe to call repeatedly. */
export async function initAppFlavor(): Promise<AppFlavor> {
  if (cached) return cached;
  const envFlavor = parseAppFlavor(import.meta.env?.VITE_APP_FLAVOR);
  const { platform, appId } = envFlavor ? { platform: "web" as const, appId: null } : await readNativeIdentity();
  cached = resolveAppFlavor({ envFlavor, platform, appId });
  return cached;
}

/** Boot-cached flavor. Safe before init (defaults to airpal). */
export function getAppFlavor(): AppFlavor {
  return cached ?? "airpal";
}

/** True inside the Pass native shell (or VITE_APP_FLAVOR=pass previews). */
export function isPassApp(): boolean {
  return getAppFlavor() === "pass";
}

export function flavorStartRoute(flavor: AppFlavor = getAppFlavor()): string {
  return FLAVOR_START_ROUTE[flavor];
}
