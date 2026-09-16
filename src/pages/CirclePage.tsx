import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { MapPin, UserCheck, UserPlus, Users } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { bioPath } from "@shared/bio";
import { circleHandles, sameCity, type CircleTab, type Presence } from "@/lib/circle";
import { getFirebaseDb } from "@/lib/firebase";
import { listPeople } from "@/lib/people";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: CircleTab; label: string }> = [
  { id: "nearby", label: "Nearby" },
  { id: "met", label: "Met" },
  { id: "following", label: "Following" },
  { id: "followers", label: "Followers" },
  { id: "likes", label: "Likes" },
];

type Row = { handle: string; name: string; sub?: string; city?: string };

export function CirclePage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { user, authReady } = useAuth();
  const { mine } = useBio();
  const { city, shareLocation, setShareLocation } = useLocalNow();
  const { followedHandles, likedHandles, followerHandles, likedByHandles, isFollowing, toggleFollow } = useSocial();
  const people = listPeople();
  const met = useMemo(
    () => new Set(people.map((p) => (p.handle || "").toLowerCase()).filter(Boolean)),
    [people],
  );
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const tabParam = new URLSearchParams(search).get("tab") as CircleTab | null;
  const [tab, setTab] = useState<CircleTab>(TABS.some((t) => t.id === tabParam) ? tabParam! : "nearby");

  const sets = {
    following: followedHandles,
    followers: followerHandles,
    liked: likedHandles,
    likedBy: likedByHandles,
    met,
  };
  const handles = useMemo(() => circleHandles(sets), [followedHandles, followerHandles, likedHandles, likedByHandles, met]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || handles.length === 0) return;
    let live = true;
    void Promise.all(
      handles.map(async (h) => {
        try {
          const snap = await getDoc(doc(db, "presence", h));
          if (!snap.exists()) return null;
          const data = snap.data() as { city?: string; updatedAt?: string; handle?: string };
          if (!data.city) return null;
          return { handle: h, city: data.city, updatedAt: data.updatedAt || "" } satisfies Presence;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (!live) return;
      const next: Record<string, Presence> = {};
      for (const row of rows) if (row) next[row.handle] = row;
      setPresence(next);
    });
    return () => {
      live = false;
    };
  }, [handles.join("|")]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next="/circle"
        kicker="Circle"
        title="Your Circle"
        lede="People you meet, follow, and like — plus who likes you back. Share your city so they can find you nearby."
      />
    );
  }

  function rowFor(handle: string, extra?: string): Row {
    const metRow = people.find((p) => p.handle === handle);
    return {
      handle,
      name: metRow?.name || handle,
      sub: extra,
      city: presence[handle]?.city,
    };
  }

  const nearbyRows = handles
    .filter((h) => sameCity(presence[h]?.city, city))
    .map((h) => rowFor(h, presence[h]?.city));
  const metRows: Row[] = people.map((p) => ({
    handle: p.handle || p.id,
    name: p.name,
    sub: p.whereMet,
    city: p.handle ? presence[p.handle]?.city : undefined,
  }));
  const followingRows = Array.from(followedHandles).map((h) => rowFor(h, "Following"));
  const followerRows = Array.from(followerHandles).map((h) => rowFor(h, "Follows you"));
  const likeRows = [
    ...Array.from(likedByHandles).map((h) => rowFor(h, "Likes you")),
    ...Array.from(likedHandles)
      .filter((h) => !likedByHandles.has(h))
      .map((h) => rowFor(h, "You like")),
  ];

  const lists: Record<CircleTab, Row[]> = {
    nearby: nearbyRows,
    met: metRows,
    following: followingRows,
    followers: followerRows,
    likes: likeRows,
  };
  const rows = lists[tab];

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Circle</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">Meet your people</h1>
      <p className="mt-1 text-sm text-mute">
        Scanned, following, and likes — plus who likes you. Nearby is everyone in your Circle in {city}.
      </p>

      <label className="mt-4 flex items-start gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
        <input type="checkbox" className="mt-1" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
        <span>
          <span className="block text-sm font-semibold">Share that I’m in {city}</span>
          <span className="block text-xs text-mute">Circle only. Tap the location pin in the top bar to select a different city or live GPS.</span>
        </span>
      </label>
      {!mine?.handle && (
        <button type="button" onClick={() => nav("/bio/setup")} className="mt-2 text-sm font-medium text-brand">
          Add a bio @handle to see who likes and follows you →
        </button>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3.5 text-sm",
              tab === t.id ? "bg-ink text-white" : "bg-white ring-1 ring-line",
            )}
          >
            {t.label}
            {t.id === "nearby" && nearbyRows.length ? ` ${nearbyRows.length}` : ""}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card px-5 py-8 text-center ring-1 ring-line">
          <Users className="mx-auto text-gold" size={22} />
          <p className="font-display mt-3 text-lg font-semibold">
            {tab === "nearby" ? "Nobody nearby yet" : tab === "met" ? "Nobody saved yet" : "Empty for now"}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-mute">
            {tab === "met"
              ? "Scan a bio QR or tap Connect on someone’s page."
              : tab === "nearby"
                ? "Share your city, follow people, or meet them on a scan — they’ll show here when they’re in the same city."
                : "Like and follow bios. When they like or follow you back, they land in Circle."}
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => nav(tab === "met" ? "/scan" : "/")}>
            {tab === "met" ? "Open Scan" : "Explore"}
          </Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.handle} className="flex items-center gap-3 rounded-3xl bg-card p-3 ring-1 ring-line">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">
                {row.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{row.name}</p>
                <p className="truncate text-xs text-mute">
                  {["@" + row.handle.replace(/^@/, ""), row.sub, row.city ? row.city : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              {row.city && sameCity(row.city, city) && (
                <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-800 sm:inline-flex">
                  <MapPin size={10} />
                  Here
                </span>
              )}
              {row.handle && !row.handle.startsWith("p-") && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleFollow(row.handle, row.name)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-paper ring-1 ring-line"
                    aria-label={isFollowing(row.handle) ? "Following" : "Follow"}
                  >
                    {isFollowing(row.handle) ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => nav(bioPath(row.handle))}
                    className="h-9 rounded-full bg-ink px-3 text-xs font-semibold text-white"
                  >
                    Bio
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
