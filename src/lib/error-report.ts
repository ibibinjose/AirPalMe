import { track } from "./analytics";

const seen = new Set<string>();
const MAX = 24;

function clip(value: string, max = 80): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function classifyError(err: unknown): string {
  const name = err instanceof Error ? err.name : "Error";
  const msg = err instanceof Error ? err.message : String(err || "");
  if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(msg) || name === "ChunkLoadError") return "chunk";
  if (/NetworkError|Failed to fetch|Load failed|network/i.test(msg) || name === "NetworkError") return "network";
  if (name === "TypeError") return "type";
  if (name === "SecurityError") return "security";
  if (name === "AbortError") return "abort";
  return "unknown";
}

/** Report a client crash without PII. Deduped per session. */
export function reportError(err: unknown, errorSource: "window" | "promise" | "boundary") {
  if (typeof window === "undefined") return;
  const name = err instanceof Error ? err.name : "Error";
  const message = clip(err instanceof Error ? err.message : String(err || "unknown"), 120);
  const path = clip(window.location.pathname || "/", 80);
  const key = `${errorSource}|${name}|${message}|${path}`;
  if (seen.has(key) || seen.size >= MAX) return;
  seen.add(key);
  void track("client_error", {
    errorClass: classifyError(err),
    errorSource,
    path,
    name: clip(name, 40),
  });
}

export function installErrorTracking() {
  if (typeof window === "undefined") return;
  const flag = window as Window & { __airpalErrors?: boolean };
  if (flag.__airpalErrors) return;
  flag.__airpalErrors = true;
  window.addEventListener("error", (event) => {
    reportError(event.error || event.message, "window");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "promise");
  });
}
