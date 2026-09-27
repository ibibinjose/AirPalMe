import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Bell,
  CalendarDays,
  Check,
  Coffee,
  Copy,
  Globe2,
  MapPin,
  Megaphone,
  Navigation,
  QrCode,
  Share2,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { SearchBar } from "@/components/search/SearchBar";
import { AuthGate } from "@/components/auth/AuthGate";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { BioShareModal } from "@/components/bio/BioShareModal";
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
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: CircleTab; label: string; icon: typeof Users }> = [
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "followers", label: "Audience", icon: Users },
  { id: "following", label: "Following", icon: UserCheck },
  { id: "met", label: "Met", icon: Sparkles },
  { id: "likes", label: "Likes", icon: Trophy },
];

type Row = {
  handle: string;
  name: string;
  sub?: string;
  city?: string;
  avatar?: string;
  ownerUid?: string;
};

export function CirclePage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { user, authReady } = useAuth();
  const { mine } = useBio();
  const { city, shareLocation, setShareLocation } = useLocalNow();
  const { followedHandles, likedHandles, followerHandles, likedByHandles, isFollowing, toggleFollow } = useSocial();
  const { myPlans } = usePlans();

  const [invited, setInvited] = useState(() => hasMarkedCircleInvite());
  const [copiedLink, setCopiedLink] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [hereOpen, setHereOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [catchUpTarget, setCatchUpTarget] = useState<Row | null>(null);

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
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-mute">Loading your Circle…</p>
      </div>
    );
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
      avatar: metRow?.photo,
    };
  }

  const nearbyRows = handles.filter((h) => sameCity(presence[h]?.city, city)).map((h) => rowFor(h, presence[h]?.city));
  const metRows: Row[] = people.map((p) => ({
    handle: p.handle || p.id,
    name: p.name,
    sub: p.whereMet,
    city: p.handle ? presence[p.handle]?.city : undefined,
    avatar: p.photo,
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
    void triggerHaptic("light");
    const url = inviteLinkFor(handle);
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

  async function copyInviteLink() {
    const handle = mine?.handle;
    if (!handle) {
      nav("/bio/setup");
      return;
    }
    void triggerHaptic("light");
    const url = inviteLinkFor(handle);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      markCircleInviteSent();
      setInvited(true);
      toast.success("Circle invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.message(url);
    }
  }

  function openAnnounce() {
    if (!mine?.handle) {
      nav("/bio/setup");
      return;
    }
    void triggerHaptic("light");
    setAnnounceOpen(true);
  }

  const inviteUrl = mine?.handle ? inviteLinkFor(mine.handle) : "https://airpal.me";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      {/* Top Header Banner with Liquid Glass Effect */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/10 via-card to-card p-6 ring-1 ring-line shadow-xs">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
                <Users size={12} /> AirPal Circle
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-mute">
                <MapPin size={12} className="text-emerald-500" /> {city}
              </span>
            </div>
            <h1 className="font-display mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Social &amp; Plans Circle
            </h1>
            <p className="mt-0.5 max-w-lg text-xs sm:text-sm text-mute">
              Friends, colleagues and mates connected in one place.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => nav("/me/inbox")}
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-paper text-ink ring-1 ring-line hover:bg-card transition"
              aria-label="Inbox"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-paper px-3.5 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition"
            >
              <QrCode size={15} className="text-brand" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => void inviteCircle()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand/90 transition"
            >
              <Share2 size={15} />
              <span>Invite</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { n: members, l: "In Circle", sub: "Total network", icon: Users },
            { n: nearbyRows.length, l: "Nearby", sub: `In ${city}`, icon: MapPin },
            { n: followerHandles.size, l: "Audience", sub: "Followers", icon: Sparkles },
            { n: myPlans.length, l: "Active Plans", sub: "Events & hangouts", icon: CalendarDays },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.l} className="rounded-2xl bg-paper/80 p-3.5 ring-1 ring-line/60 backdrop-blur-sm">
                <div className="flex items-center justify-between text-mute mb-1">
                  <span className="text-[11px] font-semibold">{s.l}</span>
                  <Icon size={14} className="text-brand" />
                </div>
                <p className="font-display text-2xl font-bold tracking-tight text-ink">{s.n}</p>
                <p className="text-[10px] text-mute">{s.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Responsive 12-Column Desktop Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Stream (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={openAnnounce}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-card p-3.5 text-center ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-[0.99] shadow-2xs"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand group-hover:scale-105 transition-transform">
                <Megaphone size={18} />
              </span>
              <div>
                <span className="block text-xs font-bold text-ink">Announce</span>
                <span className="block text-[10px] text-mute">Broadcast to Circle</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => (mine?.handle ? setStatusOpen(true) : nav("/bio/setup"))}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-card p-3.5 text-center ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-[0.99] shadow-2xs"
            >
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
                <span className={cn("h-3 w-3 rounded-full", statusInfo.dotColor)} />
              </span>
              <div>
                <span className="block text-xs font-bold text-ink">Live Status</span>
                <span className="block truncate max-w-[90px] text-[10px] text-mute">
                  {mine?.customStatusEmoji ? `${mine.customStatusEmoji} ` : ""}
                  {mine?.customStatus || statusInfo.label}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => nav("/plan/new")}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-card p-3.5 text-center ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-[0.99] shadow-2xs"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-600 group-hover:scale-105 transition-transform">
                <CalendarDays size={18} />
              </span>
              <div>
                <span className="block text-xs font-bold text-ink">New Plan</span>
                <span className="block text-[10px] text-mute">Meetup or hangout</span>
              </div>
            </button>
          </div>

          {/* Location & "I'm Here" Live Pin Card */}
          <div className="overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    myHere ? "bg-emerald-500/15 text-emerald-600" : "bg-brand/10 text-brand",
                  )}
                >
                  <Navigation size={18} className={myHere ? "animate-pulse" : ""} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink">{myHere ? "You’re live at venue" : "Event Space & Presence"}</p>
                    {myHere && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-mute">
                    {myHere ? myHere.placeName : `Share "I’m here" with your Circle in ${city}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {myHere ? (
                  <button
                    type="button"
                    onClick={() => {
                      void stopHereRemote()
                        .then(() => {
                          setMyHere(null);
                          toast.success("Stopped sharing location");
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "Could not stop"));
                    }}
                    className="rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!mine?.handle) {
                        nav("/bio/setup");
                        return;
                      }
                      setHereOpen(true);
                    }}
                    className="rounded-xl bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/20 transition"
                  >
                    Share Pin
                  </button>
                )}
              </div>
            </div>

            {/* Live Board of pins from Circle members */}
            <CircleHereBoard
              pins={herePins}
              myHandle={mine?.handle}
              onOpen={(p) => (p.planId ? nav(`/plan/${p.planId}`) : p.placeId ? nav(`/p/${p.placeId}`) : undefined)}
            />
          </div>

          {/* Members List & Filter Tabs */}
          <div className="rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand" />
                <h2 className="text-base font-bold text-ink">Circle Directory</h2>
                <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-bold text-mute">
                  {rows.length} {rows.length === 1 ? "person" : "people"}
                </span>
              </div>

              {/* Search Bar: Mobile & iOS friendly */}
              <div className="flex-1 sm:max-w-xs">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  sizeVariant="sm"
                  variant="paper"
                  placeholder="Search by name, handle, city…"
                  aria-label="Search circle"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((t) => {
                const count = lists[t.id].length;
                const Icon = t.icon;
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setTab(t.id);
                    }}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition active:scale-95",
                      isActive
                        ? "bg-brand text-white shadow-2xs"
                        : "bg-paper text-ink ring-1 ring-line/60 hover:bg-card hover:ring-line",
                    )}
                  >
                    <Icon size={12} className={isActive ? "text-white" : "text-mute"} />
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isActive ? "bg-white/20 text-white font-bold" : "bg-card text-mute",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Member Cards */}
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                  <Users size={24} />
                </div>
                <p className="font-display mt-3 text-base font-bold text-ink">
                  {tab === "nearby"
                    ? `No one active nearby in ${city} yet`
                    : tab === "followers"
                      ? "No audience members yet"
                      : tab === "met"
                        ? "No people recorded as met yet"
                        : "Your Circle is waiting for connections"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-mute">
                  Share your link or invite friends and guests to follow your profile.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void inviteCircle()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    <Share2 size={13} />
                    Invite someone
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-xs font-semibold text-ink ring-1 ring-line"
                  >
                    <Globe2 size={13} />
                    Explore Sydney
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-line/60">
                {rows.map((row) => {
                  const cleanHandle = row.handle.replace(/^@/, "");
                  const isFollowingMember = isFollowing(cleanHandle);
                  const isNearby = row.city && sameCity(row.city, city);

                  return (
                    <div
                      key={row.handle}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 transition hover:bg-paper/40 rounded-2xl"
                    >
                      {/* Avatar and Bio Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => nav(bioPath(cleanHandle))}
                          className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-tr from-brand/20 to-purple-500/20 ring-1 ring-line font-display text-base font-bold text-brand group-hover:scale-105 transition-transform"
                        >
                          {row.avatar ? (
                            <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
                          ) : (
                            row.name[0]?.toUpperCase()
                          )}
                          {isNearby && (
                            <span
                              className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                              title="In your city"
                            />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => nav(bioPath(cleanHandle))}
                              className="truncate text-sm font-bold text-ink hover:text-brand transition text-left"
                            >
                              {row.name}
                            </button>
                            {isNearby && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600">
                                <MapPin size={9} /> {row.city || city}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-mute">
                            {["@" + cleanHandle, row.sub].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons for Member */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            void triggerHaptic("light");
                            setCatchUpTarget(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition active:scale-95"
                          title="Propose 1-on-1 Coffee or Sync"
                        >
                          <Coffee size={13} />
                          <span>Catch up</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void triggerHaptic("light");
                            nav(
                              `/plan/new?with=${encodeURIComponent(cleanHandle)}&name=${encodeURIComponent(row.name)}`,
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand/90 transition active:scale-95"
                          title="Create an itinerary plan together"
                        >
                          <CalendarDays size={13} />
                          <span>Plan</span>
                        </button>

                        {!cleanHandle.startsWith("p-") && (
                          <button
                            type="button"
                            onClick={() => {
                              void triggerHaptic("light");
                              toggleFollow(cleanHandle, row.name);
                            }}
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-xl ring-1 transition active:scale-95",
                              isFollowingMember
                                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-600"
                                : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                            )}
                            aria-label={isFollowingMember ? "Following" : "Follow"}
                            title={isFollowingMember ? "Following" : "Follow"}
                          >
                            {isFollowingMember ? <UserCheck size={14} /> : <UserPlus size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Circle Quests Progress */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs" aria-label="Circle quests">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-gold/15 text-gold">
                  <Trophy size={15} />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">{quest.level.name}</p>
                  <p className="text-[10px] text-mute">
                    Level {quest.level.rank} · {quest.points} pts
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-brand">
                {quest.completed}/{quest.total} done
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-purple-600 transition-all duration-500"
                style={{ width: `${Math.round((quest.completed / quest.total) * 100)}%` }}
              />
            </div>

            <ul className="mt-3.5 space-y-2">
              {CIRCLE_QUESTS.map((q) => {
                const isDone = quest.done[q.id];
                return (
                  <li
                    key={q.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl p-2 text-xs transition",
                      isDone ? "bg-emerald-500/5 text-ink" : "bg-paper hover:bg-paper/80",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]",
                          isDone ? "bg-emerald-600 text-white" : "bg-line text-mute",
                        )}
                      >
                        {isDone ? <Check size={11} strokeWidth={3} /> : q.points}
                      </span>
                      <span className={cn("truncate font-medium", isDone && "line-through text-mute")}>
                        {q.title}
                      </span>
                    </div>

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (q.id === "invite") void inviteCircle();
                          else if (q.id === "city") setShareLocation(true);
                          else nav(questHref[q.id]);
                        }}
                        className="shrink-0 text-[11px] font-bold text-brand hover:underline"
                      >
                        Start
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Quick Invite & Share Card */}
          <div className="rounded-3xl bg-gradient-to-br from-paper to-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center gap-2 text-brand">
              <Zap size={16} />
              <h3 className="text-sm font-bold text-ink">Grow your Circle</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Send your personal AirPal invite link to friends, family, or your audience.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card p-1.5 ring-1 ring-line">
              <span className="truncate pl-2 text-xs font-mono text-mute">{inviteUrl.replace(/^https?:\/\//, "")}</span>
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="ml-auto inline-flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1 text-xs font-bold text-white shrink-0 hover:bg-brand/90 transition"
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-paper py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition"
              >
                <QrCode size={14} className="text-brand" />
                <span>Show QR</span>
              </button>
              <button
                type="button"
                onClick={() => void inviteCircle()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand/90 transition"
              >
                <Share2 size={14} />
                <span>Share link</span>
              </button>
            </div>
          </div>

          {/* Location & Privacy Assurance Card */}
          <div className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-2xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-[#1805db]"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
              />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-ink">Share city presence ({city})</span>
                <span className="block text-[11px] text-mute leading-relaxed">
                  Only your general city is shared with Circle members. We never share exact home addresses or coordinates.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Modals and Sheets */}
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

      {mine?.handle && (
        <BioShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          handle={mine.handle}
          name={mine.name || mine.handle}
          url={inviteUrl}
        />
      )}

      {catchUpTarget && (
        <BioCatchUpModal
          open={Boolean(catchUpTarget)}
          onClose={() => setCatchUpTarget(null)}
          handle={catchUpTarget.handle.replace(/^@/, "")}
          name={catchUpTarget.name}
          city={catchUpTarget.city || city}
          avatar={catchUpTarget.avatar}
          ownerUid={catchUpTarget.ownerUid}
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
