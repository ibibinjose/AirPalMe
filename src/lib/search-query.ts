import { HANDLE_MIN, HANDLE_RE, normalizeHandle } from "@shared/bio";

/** Parse a search box value into a text needle and an optional exact @handle. */
export function searchNeedle(raw: string): {
  text: string;
  handle: string;
  /** True when the query is clearly a handle lookup (@prefix or whole-token handle shape). */
  looksLikeHandle: boolean;
} {
  const trimmed = raw.trim();
  const text = trimmed.toLowerCase();
  const handle = normalizeHandle(trimmed);
  const withAt = trimmed.startsWith("@");
  const looksLikeHandle = handle.length >= HANDLE_MIN && (withAt || (!/\s/.test(trimmed) && HANDLE_RE.test(handle)));
  return { text, handle, looksLikeHandle };
}

/** Match a profile by name, shortWhy, or @handle (with or without leading @ in the query). */
export function profileMatchesSearch(
  profile: { handle: string; name: string; shortWhy?: string },
  needle: { text: string; handle: string },
): boolean {
  if (!needle.text && !needle.handle) return false;
  const handle = normalizeHandle(profile.handle);
  if (needle.handle && (handle === needle.handle || handle.includes(needle.handle))) return true;
  const q = needle.text.replace(/^@+/, "");
  if (!q) return false;
  if (handle.includes(q)) return true;
  if (profile.name.toLowerCase().includes(q)) return true;
  if (profile.shortWhy?.toLowerCase().includes(q)) return true;
  return false;
}
