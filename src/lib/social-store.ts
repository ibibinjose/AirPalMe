export type SocialKind = "like" | "follow";

const PREFIX = "airpal:social";

function keyOf(kind: SocialKind): string {
  return `${PREFIX}:${kind}:v1`;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSocialSet(kind: SocialKind): Set<string> {
  try {
    const raw = storage()?.getItem(keyOf(kind));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string" && v.length > 0));
  } catch {
    return new Set();
  }
}

export function persistSocialSet(kind: SocialKind, ids: Set<string> | string[]): void {
  try {
    storage()?.setItem(keyOf(kind), JSON.stringify(Array.from(ids)));
  } catch {
    /* private mode: local social state is best-effort */
  }
}

/** Pure toggle helper — returns the next set plus whether the id was added. */
export function toggleSocialId(current: Set<string>, id: string): { next: Set<string>; added: boolean } {
  const next = new Set(current);
  const added = !next.has(id);
  if (added) next.add(id);
  else next.delete(id);
  return { next, added };
}
