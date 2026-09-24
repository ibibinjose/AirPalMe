import { useEffect, useState } from "react";
import type { BioProfile } from "@shared/bio";
import type { Speaker } from "@shared/event";
import { fetchPublicBio } from "./bio-store";

export interface ResolvedSpeaker extends Speaker {
  /** Live profile photo when the speaker linked an AirPal @handle. */
  photoUrl?: string;
  /** Live display name from the linked bio; falls back to the stored name. */
  displayName: string;
}

const bioCache = new Map<string, Promise<BioProfile | null>>();

function cachedBio(handle: string): Promise<BioProfile | null> {
  const key = handle.toLowerCase();
  const hit = bioCache.get(key);
  if (hit) return hit;
  const pending = fetchPublicBio(key).catch(() => null);
  bioCache.set(key, pending);
  return pending;
}

/** Merge a stored speaker with its linked public bio. Pure and testable. */
export function mergeSpeakerBio(speaker: Speaker, bio: Pick<BioProfile, "name" | "avatar"> | null): ResolvedSpeaker {
  if (!bio) return { ...speaker, displayName: speaker.name };
  return {
    ...speaker,
    displayName: bio.name?.trim() || speaker.name,
    photoUrl: bio.avatar || undefined,
  };
}

/**
 * Resolve @handle-linked speakers to live names + photos. External guests
 * (no handle) render from stored data. Results cache per handle per session.
 */
export function useSpeakerBios(speakers: Speaker[] | undefined): ResolvedSpeaker[] {
  const [resolved, setResolved] = useState<ResolvedSpeaker[]>(() =>
    (speakers || []).map((s) => mergeSpeakerBio(s, null)),
  );

  const key = JSON.stringify((speakers || []).map((s) => `${s.handle || ""}|${s.name}|${s.role || ""}`));

  useEffect(() => {
    let cancelled = false;
    const list = speakers || [];
    if (!list.some((s) => s.handle)) {
      setResolved(list.map((s) => mergeSpeakerBio(s, null)));
      return;
    }
    void (async () => {
      const rows = await Promise.all(
        list.map(async (s) => (s.handle ? mergeSpeakerBio(s, await cachedBio(s.handle)) : mergeSpeakerBio(s, null))),
      );
      if (!cancelled) setResolved(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return resolved;
}
