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

/** Split search input into normalized search tokens, stripping punctuation. */
export function tokenizeSearchQuery(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@_-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export interface SearchScorable {
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  tags?: string[];
  handle?: string;
  keywords?: string[];
}

/**
 * Score relevance of an item against a search query.
 * Returns 0 if item does not match. Higher scores reflect closer relevance.
 */
export function scoreSearchItem(item: SearchScorable, query: string): number {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return 0;

  const needle = searchNeedle(trimmed);
  const tokens = tokenizeSearchQuery(trimmed);
  if (tokens.length === 0) return 0;

  let score = 0;
  const title = (item.title || "").toLowerCase();
  const subtitle = (item.subtitle || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const handle = (item.handle || "").toLowerCase();
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  const keywords = (item.keywords || []).map((k) => k.toLowerCase());

  // 1. Exact match boosts
  if (title === trimmed) {
    score += 120;
  } else if (title.startsWith(trimmed)) {
    score += 80;
  } else if (title.includes(trimmed)) {
    score += 50;
  }

  // Handle exact match
  if (needle.handle && handle && (handle === needle.handle || `@${handle}` === trimmed)) {
    score += 150;
  } else if (handle && handle.includes(needle.handle)) {
    score += 70;
  }

  // 2. Token-level matching across fields
  let matchedTokens = 0;
  for (const token of tokens) {
    const cleanToken = token.replace(/^@+/, "");
    if (!cleanToken) continue;

    let tokenHit = false;
    if (title.includes(cleanToken)) {
      score += 30;
      tokenHit = true;
    }
    if (handle.includes(cleanToken)) {
      score += 25;
      tokenHit = true;
    }
    if (subtitle.includes(cleanToken)) {
      score += 15;
      tokenHit = true;
    }
    if (cat.includes(cleanToken)) {
      score += 15;
      tokenHit = true;
    }
    if (desc.includes(cleanToken)) {
      score += 10;
      tokenHit = true;
    }
    if (tags.some((t) => t.includes(cleanToken))) {
      score += 12;
      tokenHit = true;
    }
    if (keywords.some((k) => k.includes(cleanToken))) {
      score += 15;
      tokenHit = true;
    }

    if (tokenHit) {
      matchedTokens++;
    }
  }

  // If there are multiple tokens, reward items that match all tokens
  if (tokens.length > 1 && matchedTokens === tokens.length) {
    score += 40;
  }

  // Require at least one token match
  if (matchedTokens === 0 && score === 0) {
    return 0;
  }

  return score;
}

/**
 * Splits text into segments marking which parts match the search query.
 */
export function highlightSearchMatch(text: string, query: string): Array<{ text: string; match: boolean }> {
  if (!text) return [];
  const trimmed = query.trim();
  if (!trimmed) return [{ text, match: false }];

  const tokens = tokenizeSearchQuery(trimmed)
    .map((t) => t.replace(/^@+/, ""))
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0) return [{ text, match: false }];

  // Build a regex matching any of the tokens
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");

  const parts = text.split(regex);
  return parts.filter(Boolean).map((part) => ({
    text: part,
    match: tokens.some((t) => t.toLowerCase() === part.toLowerCase()),
  }));
}

