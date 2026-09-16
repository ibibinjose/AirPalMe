import { getNativePlatform, isNativeApp } from "@/lib/native";

declare const __APP_VERSION_NAME__: string | undefined;
declare const __APP_VERSION_CODE__: string | undefined;
declare const __BUILD_TIMESTAMP__: string | undefined;

export interface BuildInfo {
  versionName: string;
  versionCode: string;
  buildTimestamp: string;
  environment: string;
  isNative: boolean;
  platform: "ios" | "android" | "web";
}

export interface RuntimeDiagnostics extends BuildInfo {
  userAgent: string;
  viewport: string;
  dpr: number;
  online: boolean;
  language: string;
  timeZone: string;
  currentUrl: string;
  storageKeysCount: number;
  hasAnonymousSession: boolean;
}

/**
 * Returns application version details extracted from android/app/build.gradle at build time.
 */
export function getBuildInfo(): BuildInfo {
  const versionName =
    typeof __APP_VERSION_NAME__ !== "undefined" && __APP_VERSION_NAME__
      ? __APP_VERSION_NAME__
      : "2.0.0";
  const versionCode =
    typeof __APP_VERSION_CODE__ !== "undefined" && __APP_VERSION_CODE__
      ? __APP_VERSION_CODE__
      : "2";
  const buildTimestamp =
    typeof __BUILD_TIMESTAMP__ !== "undefined" && __BUILD_TIMESTAMP__
      ? __BUILD_TIMESTAMP__
      : "";

  return {
    versionName,
    versionCode,
    buildTimestamp,
    environment: import.meta.env.MODE || "production",
    isNative: isNativeApp(),
    platform: getNativePlatform(),
  };
}

/**
 * Gathers complete runtime diagnostic data for troubleshooting user-reported issues.
 */
export function getRuntimeDiagnostics(): RuntimeDiagnostics {
  const build = getBuildInfo();
  const isBrowser = typeof window !== "undefined";

  let storageCount = 0;
  let hasAnon = false;
  if (isBrowser) {
    try {
      storageCount = window.localStorage.length;
      hasAnon = Object.keys(window.localStorage).some(
        (k) => k.startsWith("firebase:authUser") || k.includes("airpal"),
      );
    } catch {
      /* ignore storage access restrictions */
    }
  }

  return {
    ...build,
    userAgent: isBrowser ? navigator.userAgent : "SSR",
    viewport: isBrowser ? `${window.innerWidth}x${window.innerHeight}` : "unknown",
    dpr: isBrowser ? window.devicePixelRatio || 1 : 1,
    online: isBrowser ? navigator.onLine : true,
    language: isBrowser ? navigator.language : "en-US",
    timeZone: isBrowser ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    currentUrl: isBrowser ? window.location.href : "",
    storageKeysCount: storageCount,
    hasAnonymousSession: hasAnon,
  };
}

/**
 * Generates a formatted markdown string of diagnostic data suitable for support tickets.
 */
export function formatDiagnosticsReport(diag: RuntimeDiagnostics): string {
  return [
    `### AirPal Client Diagnostic Report`,
    `- **Version Name (build.gradle)**: ${diag.versionName}`,
    `- **Version Code**: ${diag.versionCode}`,
    `- **Platform**: ${diag.platform} (${diag.isNative ? "Native Capacitor" : "Web / PWA"})`,
    `- **Environment**: ${diag.environment}`,
    `- **Build Timestamp**: ${diag.buildTimestamp || "N/A"}`,
    `- **Current URL**: ${diag.currentUrl}`,
    `- **Viewport**: ${diag.viewport} (Scale: ${diag.dpr}x)`,
    `- **Network Online**: ${diag.online ? "Yes" : "No"}`,
    `- **Timezone**: ${diag.timeZone}`,
    `- **Language**: ${diag.language}`,
    `- **Storage Items**: ${diag.storageKeysCount}`,
    `- **User Agent**: \`${diag.userAgent}\``,
  ].join("\n");
}
