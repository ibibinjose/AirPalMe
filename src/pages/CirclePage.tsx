import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Heart, MapPin, ScanLine, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { WaveButton } from "@/components/social/SocialButtons";
import { doc, getDoc } from "firebase/firestore";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { bioPath, normalizeHandle } from "@shared/bio";
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

function initialOf(name: string) {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function Avatar({
  name,
  ring,
  size = "md",
}: {
  name: string;
  ring?: "gold" | "ink";
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-ink font-display font-bold text-white",
        size === "md" ? "h-12 w-12 text-lg" : "h-14 w-14 text-xl",
        ring === "gold" && "ring-2 ring-gold ring-offset-2 ring-offset-card",
        ring === "ink" && "ring-2 ring-ink ring-offset-2 ring-offset-card",
      )}
    >
      {initialOf(name)}
    </span>
  );
}

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
  const [query, setQuery] = useState("");
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
  const counts: Record<CircleTab, number> = {
    nearby: nearbyRows.length,
    met: metRows.length,
    following: followingRows.length,
    followers: followerRows.length,
    likes: likeRows.length,
  };

  const q = query.trim().toLowerCase();
  const rows = (q
    ? lists[tab].filter((r) =>
        [r.name, r.handle, r.sub, r.city].filter(Boolean).join(" ").toLowerCase().includes(q),
      )
    : lists[tab]
  ).slice().sort((a, b) => {
    const aLiked = likedByHandles.has(a.handle) ? 0 : 1;
    const bLiked = likedByHandles.has(b.handle) ? 0 : 1;
    if (aLiked !== bLiked) return aLiked - bLiked;
    return a.name.localeCompare(b.name);
  });

  const likedByList = Array.from(likedByHandles).map((h) => rowFor(h));
  const isMutual = (handle: string) => isFollowing(handle) && followerHandles.has(handle);

  const stats = [
    { id: "nearby" as CircleTab, value: nearbyRows.length, label: nearbyRows.length === 1 ? "nearby now" : "nearby now" },
    { id: "following" as CircleTab, value: followingRows.length, label: "following" },
    { id: "likes" as CircleTab, value: likedByHandles.size, label: "like you" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:pt-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Circle</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-balance text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Your people
        </h1>
        <Button onClick={() => nav("/scan")} className="h-10 gap-2 rounded-full px-4">
          <ScanLine size={16} />
          <span>Scan to meet</span>
        </Button>
      </div>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mute">
        Everyone you've scanned, followed, and liked — plus who likes you back. Nearby shows your
        Circle in {city}.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setTab(s.id)}
            aria-pressed={tab === s.id}
            className={cn(
              "rounded-2xl border-2 px-3 py-2.5 text-left transition active:scale-[0.98]",
              tab === s.id
                ? "border-ink bg-ink text-white shadow-card"
                : "border-ink bg-card text-ink shadow-card hover:-translate-y-0.5",
            )}
          >
            <span className="font-display block text-2xl font-bold leading-none">{s.value}</span>
            <span className={cn("mt-1 block text-xs font-medium", tab === s.id ? "text-white/70" : "text-mute")}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {likedByList.length > 0 && (
        <section aria-label="People who like you" className="mt-4 rounded-hero border-2 border-ink bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Heart size={15} className="fill-brand text-brand" />
              They like you
            </p>
            <button
              type="button"
              onClick={() => setTab("likes")}
              className="text-[13px] font-semibold text-brand"
            >
              See all →
            </button>
          </div>
          <ul className="no-scrollbar -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
            {likedByList.slice(0, 12).map((row) => (
              <li key={row.handle}>
                <button
                  type="button"
                  onClick={() => nav(bioPath(row.handle))}
                  className="group flex w-16 flex-col items-center gap-1.5"
                >
                  <Avatar name={row.name} ring="gold" size="lg" />
                  <span className="w-full truncate text-center text-xs font-semibold text-ink group-hover:text-brand">
                    {row.name}
                  </span>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                    Say hi
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-line">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
          <MapPin size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Visible in {city}</span>
          <span className="block truncate text-xs text-mute">Circle only · change city from the pin up top</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={shareLocation}
          aria-label={`Share that I'm in ${city}`}
          onClick={() => setShareLocation(!shareLocation)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition",
            shareLocation ? "bg-emerald-500" : "bg-ink/15",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
              shareLocation ? "left-6" : "left-1",
            )}
          />
        </button>
      </div>
      {!mine?.handle && (
        <button type="button" onClick={() => nav("/bio/setup")} className="mt-2.5 text-sm font-semibold text-brand">
          Add a bio @handle to see who likes and follows you →
        </button>
      )}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:w-56 sm:shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, handles…"
            aria-label="Search your Circle"
            className="h-10 w-full rounded-full border border-transparent bg-ink/[0.05] pl-10 pr-4 text-sm text-ink outline-none placeholder:text-mute focus:border-brand focus:bg-card"
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0" role="tablist" aria-label="Circle lists">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition",
                tab === t.id ? "bg-ink text-white" : "bg-ink/[0.05] text-mute hover:text-ink",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                  tab === t.id ? "bg-white/20 text-white" : "bg-ink/10 text-ink",
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-xs font-medium text-mute" role="status">
          {rows.length} {rows.length === 1 ? "person" : "people"}
          {q ? (
            <>
              {" "}matching “{query.trim()}”{" "}
              <button type="button" onClick={() => setQuery("")} className="font-semibold text-brand">
                Clear
              </button>
            </>
          ) : null}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-4 rounded-hero border-2 border-ink bg-card p-8 text-center shadow-card md:p-10">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand/10 text-brand">
            <Users size={30} />
          </div>
          <h2 className="font-display text-balance text-2xl font-bold tracking-tight text-ink">
            {q
              ? "No matches in your Circle"
              : tab === "nearby"
                ? "Nobody nearby yet"
                : tab === "met"
                  ? "Nobody saved yet"
                  : "Empty for now"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-mute">
            {q
              ? "Try a different name or @handle."
              : tab === "met"
                ? "Scan a bio QR or tap Connect on someone's page — they'll land here."
                : tab === "nearby"
                  ? "Share your city, follow people, or meet them on a scan — they'll show here when they're in the same city."
                  : "Like and follow bios. When they like or follow you back, they land in Circle."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {q ? (
              <Button onClick={() => setQuery("")} className="h-11 rounded-full px-6">
                Clear search
              </Button>
            ) : (
              <>
                <Button onClick={() => nav(tab === "met" ? "/scan" : "/")} className="h-11 gap-2 rounded-full px-6">
                  <ScanLine size={16} />
                  <span>{tab === "met" ? "Open Scan" : "Explore"}</span>
                </Button>
                {tab !== "nearby" && (
                  <Button variant="ghost" onClick={() => setTab("nearby")} className="h-11 rounded-full border border-ink px-5">
                    <MapPin size={15} className="text-brand" />
                    <span>Nearby</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const likedYou = likedByHandles.has(row.handle);
            const mutual = row.handle ? isMutual(row.handle) : false;
            const hasBio = Boolean(row.handle) && !row.handle.startsWith("p-");
            const here = Boolean(row.city) && sameCity(row.city, city);
            const myHandle = mine?.handle || "";
            const selfRow = Boolean(myHandle) && normalizeHandle(myHandle) === normalizeHandle(row.handle);
            return (
              <li
                key={row.handle}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line transition",
                  hasBio && "cursor-pointer hover:ring-ink",
                )}
                onClick={hasBio ? () => nav(bioPath(row.handle)) : undefined}
              >
                <Avatar name={row.name} ring={likedYou ? "gold" : mutual ? "ink" : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-bold text-ink">{row.name}</span>
                    {mutual && (
                      <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold ring-1 ring-gold/30">
                        Mutual
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-mute">
                    {[row.handle.startsWith("p-") ? null : `@${row.handle.replace(/^@/, "")}`, row.sub, row.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {here && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-500/25">
                    <MapPin size={10} />
                    Here
                  </span>
                )}
                {hasBio && (
                  <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {here && !selfRow && <WaveButton variant="icon" handle={row.handle} name={row.name} />}
                    <button
                      type="button"
                      onClick={() => toggleFollow(row.handle, row.name)}
                      aria-pressed={isFollowing(row.handle)}
                      aria-label={isFollowing(row.handle) ? `Following ${row.name}` : `Follow ${row.name}`}
                      className={cn(
                        "flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition active:scale-95",
                        isFollowing(row.handle)
                          ? "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/30"
                          : "bg-ink text-white",
                      )}
                    >
                      {isFollowing(row.handle) ? <UserCheck size={13} /> : <UserPlus size={13} />}
                      <span className="hidden min-[380px]:inline">
                        {isFollowing(row.handle) ? "Following" : "Follow"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => nav(bioPath(row.handle))}
                      className="h-9 rounded-full bg-ink/[0.05] px-3 text-xs font-bold text-ink transition hover:bg-ink hover:text-white active:scale-95"
                    >
                      Bio
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
