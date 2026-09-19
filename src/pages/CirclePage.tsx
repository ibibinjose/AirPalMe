import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Bell, CalendarDays, MapPin, Megaphone, Navigation, Share2, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { AuthGate } from "@/components/auth/AuthGate";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { CircleAnnounceSheet } from "@/components/circle/CircleAnnounceSheet";
import { CircleHereBoard } from "@/components/circle/CircleHereBoard";
import { CircleHereSheet } from "@/components/circle/CircleHereSheet";
import { fetchHerePinsForHandles, fetchHereSharesForMe, fetchMyHerePin, stopHereRemote } from "@/lib/here";
import type { HerePin } from "@shared/here";
import { liveBackendEnabled } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { usePlans } from "@/contexts/PlanContext";
import { useSocial } from "@/contexts/SocialContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { AVAILABILITY_STATUSES, bioPath, type AvailabilityStatus } from "@shared/bio";
import {
  CIRCLE_QUESTS,
  circleHandles,
  circleQuestProgress,
  hasMarkedCircleInvite,
  markCircleInviteSent,
  sameCity,
  type CircleQuestId,
  type CircleTab,
  type Presence,
} from "@/lib/circle";
import { inviteLinkFor } from "@/lib/app-invites";
import { shareContent } from "@/lib/share";
import { getFirebaseDb } from "@/lib/firebase";
import { listPeople } from "@/lib/people";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: CircleTab; label: string }> = [
  { id: "nearby", label: "Nearby" },
  { id: "followers", label: "Audience" },
  { id: "following", label: "Following" },
  { id: "met", label: "Met" },
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
  const { myPlans } = usePlans();
  const [invited, setInvited] = useState(() => hasMarkedCircleInvite());
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [hereOpen, setHereOpen] = useState(false);
  const [myHere, setMyHere] = useState<HerePin | null>(null);
  const [herePins, setHerePins] = useState<HerePin[]>([]);
  const [query, setQuery] = useState("");
  const people = listPeople();
  const met = useMemo(() => new Set(people.map((p) => (p.handle || "").toLowerCase()).filter(Boolean)), [people]);
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
  const handles = useMemo(
    () => circleHandles(sets),
    [followedHandles, followerHandles, likedHandles, likedByHandles, met],
  );

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

  useEffect(() => {
    if (!liveBackendEnabled() || !mine?.handle) return;
    let live = true;
    void Promise.all([
      fetchMyHerePin(mine.handle),
      fetchHerePinsForHandles(handles),
      user?.uid ? fetchHereSharesForMe(user.uid) : Promise.resolve([]),
    ]).then(([own, pins, shares]) => {
      if (!live) return;
      setMyHere(own);
      const seen = new Set<string>();
      const merged: HerePin[] = [];
      for (const p of [...pins, ...shares]) {
        if (seen.has(p.handle)) continue;
        seen.add(p.handle);
        merged.push(p);
      }
      setHerePins(merged);
    });
    return () => {
      live = false;
    };
  }, [mine?.handle, user?.uid, handles.join("|")]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next="/circle"
        kicker="Circle"
        title="Bring your people here"
        lede="Creators, hosts, and friends — one Circle. Invite your audience, set a status, announce, then make a plan."
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

  const nearbyRows = handles.filter((h) => sameCity(presence[h]?.city, city)).map((h) => rowFor(h, presence[h]?.city));
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
  const needle = query.trim().toLowerCase();
  const rows = lists[tab].filter(
    (r) => !needle || r.name.toLowerCase().includes(needle) || r.handle.toLowerCase().includes(needle),
  );
  const members = handles.length;
  const quest = circleQuestProgress({
    hasHandle: Boolean(mine?.handle),
    sharingCity: shareLocation,
    invited,
    memberCount: members,
    planCount: myPlans.length,
  });

  const questHref: Record<CircleQuestId, string> = {
    handle: "/bio/setup",
    city: "/circle",
    invite: "/circle",
    people: "/",
    plan: "/plan/new",
  };

  const statusKey: AvailabilityStatus = mine?.availabilityStatus || (mine?.openNow === false ? "offline" : "available");
  const statusInfo = AVAILABILITY_STATUSES[statusKey];

  async function inviteCircle() {
    const handle = mine?.handle;
    if (!handle) {
      nav("/bio/setup");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://airpal.me";
    const url = inviteLinkFor(handle, origin);
    const result = await shareContent({
      title: "Join my AirPal Circle",
      text: `I’m on AirPal — join my Circle and let’s make plans in ${city}.`,
      url,
      copiedMessage: "Invite link copied",
    });
    if (result === "shared" || result === "copied") {
      markCircleInviteSent();
      setInvited(true);
      toast.success(result === "copied" ? "Invite link copied" : "Invite sent");
    }
  }

  function openAnnounce() {
    if (!mine?.handle) {
      nav("/bio/setup");
      return;
    }
    setAnnounceOpen(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-12">
      <div className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-[13px] font-semibold text-mute">Circle</p>
          <h1 className="font-display mt-1 text-[32px] font-bold tracking-tight">Your people</h1>
          <p className="mt-1 max-w-sm text-[15px] leading-6 text-mute">
            Bring your audience here. Announce, plan, go together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => nav("/me/inbox")}
          className="mt-1 grid h-10 w-10 place-items-center rounded-full bg-paper text-ink"
          aria-label="Inbox"
        >
          <Bell size={18} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { n: members, l: "People" },
          { n: nearbyRows.length, l: "Nearby" },
          { n: followerHandles.size, l: "Audience" },
        ].map((s) => (
          <div key={s.l} className="rounded-[20px] bg-paper px-3 py-3 text-center">
            <p className="font-display text-[22px] font-bold tracking-tight">{s.n}</p>
            <p className="text-[11px] font-medium text-mute">{s.l}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => (mine?.handle ? setStatusOpen(true) : nav("/bio/setup"))}
        className="mt-4 flex w-full items-center gap-3 rounded-[20px] bg-card px-4 py-3.5 text-left ring-1 ring-line/70"
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusInfo.dotColor)} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-mute">Status</span>
          <span className="block truncate text-[15px] font-semibold">
            {mine?.customStatusEmoji ? `${mine.customStatusEmoji} ` : ""}
            {mine?.customStatus || statusInfo.label}
          </span>
        </span>
        <span className="text-[15px] font-semibold text-brand">Set</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (!mine?.handle) {
            nav("/bio/setup");
            return;
          }
          if (myHere) {
            void stopHereRemote()
              .then(() => {
                setMyHere(null);
                toast.success("Stopped sharing");
              })
              .catch((err) => toast.error(err instanceof Error ? err.message : "Could not stop"));
            return;
          }
          setHereOpen(true);
        }}
        className="mt-3 flex w-full items-center gap-3 rounded-[20px] bg-card px-4 py-3.5 text-left ring-1 ring-line/70"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-brand">
          <Navigation size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-mute">{myHere ? "You’re here" : "Event space"}</span>
          <span className="block truncate text-[15px] font-semibold">
            {myHere ? myHere.placeName : "Share I’m here with Circle or one person"}
          </span>
        </span>
        <span className="text-[15px] font-semibold text-brand">{myHere ? "Stop" : "Share"}</span>
      </button>

      <CircleHereBoard
        pins={herePins}
        myHandle={mine?.handle}
        onOpen={(p) => (p.planId ? nav(`/plan/${p.planId}`) : p.placeId ? nav(`/p/${p.placeId}`) : undefined)}
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { icon: Megaphone, label: "Announce", onClick: openAnnounce },
          { icon: Share2, label: "Invite", onClick: () => void inviteCircle() },
          { icon: CalendarDays, label: "Plan", onClick: () => nav("/plan/new") },
        ].map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex flex-col items-center gap-1.5 rounded-[20px] bg-paper py-3.5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
              <a.icon size={18} />
            </span>
            <span className="text-[12px] font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      {quest.completed < quest.total && (
        <section className="mt-5 rounded-[20px] bg-paper p-4" aria-label="Circle quests">
          <p className="text-[13px] font-semibold text-mute">
            {quest.level.name} · {quest.completed}/{quest.total}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line/80">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((quest.completed / quest.total) * 100)}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1">
            {CIRCLE_QUESTS.filter((q) => !quest.done[q.id])
              .slice(0, 2)
              .map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (q.id === "invite") void inviteCircle();
                      else if (q.id === "city") setShareLocation(true);
                      else nav(questHref[q.id]);
                    }}
                    className="w-full py-1.5 text-left text-[15px] text-ink"
                  >
                    {q.title}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <label className="mt-4 flex items-center gap-3 px-1 py-2">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#1805db]"
          checked={shareLocation}
          onChange={(e) => setShareLocation(e.target.checked)}
        />
        <span className="text-[15px] text-ink">Share that I’m in {city}</span>
      </label>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-mute">Audience</p>
        <span className="text-[13px] text-mute">{rows.length}</span>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people"
        className="mt-2 h-11 w-full rounded-full bg-paper px-4 text-[15px] outline-none placeholder:text-mute"
      />
      <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold",
              tab === t.id ? "bg-brand text-white" : "bg-paper text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-paper text-mute">
            <Users size={22} />
          </span>
          <p className="font-display mt-4 text-xl font-semibold">
            {tab === "nearby" ? "Nobody nearby" : tab === "followers" ? "No audience yet" : "Your Circle is waiting"}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-[15px] leading-6 text-mute">
            Invite your people. When they follow you, they land here — one place to announce and plan.
          </p>
          <button
            type="button"
            onClick={() => void inviteCircle()}
            className="mt-5 text-[15px] font-semibold text-brand"
          >
            Invite someone
          </button>
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-[20px] bg-card ring-1 ring-line/70">
          {rows.map((row, i) => (
            <li
              key={row.handle}
              className={cn("flex items-center gap-3 px-3 py-2.5", i > 0 && "border-t border-line/70")}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper font-display text-base font-bold text-ink">
                {row.name[0]?.toUpperCase()}
              </span>
              <button type="button" onClick={() => nav(bioPath(row.handle))} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[15px] font-semibold">{row.name}</p>
                <p className="truncate text-[12px] text-mute">
                  {["@" + row.handle.replace(/^@/, ""), row.sub, row.city || null].filter(Boolean).join(" · ")}
                </p>
              </button>
              {row.city && sameCity(row.city, city) && (
                <MapPin size={14} className="shrink-0 text-emerald-600" aria-label="Here" />
              )}
              {row.handle && !row.handle.startsWith("p-") && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleFollow(row.handle, row.name)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-paper"
                    aria-label={isFollowing(row.handle) ? "Following" : "Follow"}
                  >
                    {isFollowing(row.handle) ? <UserCheck size={15} /> : <UserPlus size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      nav(`/plan/new?with=${encodeURIComponent(row.handle)}&name=${encodeURIComponent(row.name)}`)
                    }
                    className="h-9 rounded-full bg-brand px-3 text-[12px] font-semibold text-white"
                  >
                    Plan
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {mine?.handle && (
        <BioStatusModal
          open={statusOpen}
          onClose={() => setStatusOpen(false)}
          handle={mine.handle}
          currentStatus={statusKey}
          currentCustomStatus={mine.customStatus}
          currentEmoji={mine.customStatusEmoji}
        />
      )}
      <CircleAnnounceSheet
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        audienceCount={followerHandles.size}
        handle={mine?.handle}
      />
      <CircleHereSheet
        open={hereOpen}
        onClose={() => setHereOpen(false)}
        people={handles.map((h) => rowFor(h))}
        onShared={() => {
          if (mine?.handle) void fetchMyHerePin(mine.handle).then(setMyHere);
          void fetchHerePinsForHandles(handles).then(setHerePins);
        }}
      />
    </div>
  );
}
