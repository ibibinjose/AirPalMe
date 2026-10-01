import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Download,
  Heart,
  MapPin,
  Plus,
  Settings2,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { Photo } from "@/components/ui/Photo";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { setShareMeta } from "@/lib/share-meta";
import { toPublicUrl } from "@/lib/public-origin";
import { docToEventRecord, eventMapsUrl, recordToCalendarBase } from "@/lib/remote-events";
import { SpeakerRow } from "@/components/event/SpeakerRow";
import { downloadMultipleIcs, type SimpleCalendarPayload } from "@/lib/calendar-export";
import { festivalDays, groupSessionsByDay, type Festival } from "@shared/festival";
import type { EventRecord } from "@shared/event";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { FestivalManagePanel } from "@/components/festival/FestivalManagePanel";
import { NotFoundPage } from "./NotFoundPage";

function sessionPayload(session: EventRecord, festivalName: string): SimpleCalendarPayload {
  return {
    id: session.id,
    title: `${session.name} · ${festivalName}`,
    description: session.description || session.shortWhy || "",
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    venue: session.venue || session.address,
    city: session.city,
  };
}

export function FestivalPage() {
  const [, params] = useRoute("/f/:slug");
  const slug = (params?.slug || "").toLowerCase();
  const { user, isAdmin } = useAuth();
  const { toggleGoing, toggleInterested, userStates } = useEvents();

  const [festival, setFestival] = useState<Festival | null | undefined>(undefined);
  const [sessions, setSessions] = useState<EventRecord[] | undefined>(undefined);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !slug) {
      setFestival(null);
      setSessions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "festivals", slug));
        if (cancelled) return;
        if (!snap.exists()) {
          setFestival(null);
          setSessions([]);
          return;
        }
        const data = { slug: snap.id, ...(snap.data() as Omit<Festival, "slug">) };
        setFestival(data);
        setShareMeta({
          title: `${data.name} · AirPal`,
          description: (data.tagline || data.description || `What's on during ${data.name} on AirPal.Me.`).slice(0, 160),
          image: data.coverImage || undefined,
          url: toPublicUrl(`/f/${data.slug}`),
        });
        const sessSnap = await getDocs(query(collection(db, "events"), where("festivalSlug", "==", snap.id)));
        if (cancelled) return;
        const rows = sessSnap.docs
          .map((d) => docToEventRecord(d.data() as Record<string, unknown>, d.id))
          .filter((r): r is EventRecord => r !== null)
          .sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));
        setSessions(rows);
      } catch {
        if (!cancelled) {
          setFestival(null);
          setSessions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const timeZone = festival?.timeZone || "Australia/Sydney";
  const days = useMemo(() => (festival ? festivalDays(festival) : []), [festival]);
  const visibleSessions = useMemo(() => {
    if (!sessions) return [];
    const canSeeDrafts = Boolean(user && festival && (festival.createdByUid === user.uid || isAdmin));
    return sessions.filter((s) => s.status === "live" || s.status === "ended" || canSeeDrafts);
  }, [sessions, user, festival, isAdmin]);
  const grouped = useMemo(() => groupSessionsByDay(visibleSessions, days, timeZone), [visibleSessions, days, timeZone]);
  const goingCount = useMemo(
    () => visibleSessions.filter((s) => userStates[s.id]?.status === "going").length,
    [visibleSessions, userStates],
  );
  const canManage = Boolean(user && festival && (festival.createdByUid === user.uid || isAdmin));

  useEffect(() => {
    if (!days.length) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      const t = window.setTimeout(() => el.scrollIntoView({ block: "start" }), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [days.length, festival?.slug]);

  function scrollToDay(anchor: string) {
    if (typeof window !== "undefined") window.location.hash = anchor;
    const el = document.getElementById(anchor) || document.getElementById("program");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadWeek() {
    const payloads = visibleSessions
      .filter((s) => s.status === "live")
      .map((s) => sessionPayload(s, festival?.name || "Festival"));
    if (!payloads.length) return;
    downloadMultipleIcs(payloads, `${slug}.ics`);
    void track("content_action", { actionType: "festival_calendar", contextId: slug, contentId: slug });
  }

  if (festival === undefined || sessions === undefined) return <PageLoading />;
  if (!festival) return <NotFoundPage />;
  if (festival.status === "draft" && !canManage) return <NotFoundPage />;

  const dateRange = days.length ? `${days[0]?.label} – ${days[days.length - 1]?.label}` : "";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      <Link href="/explore" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mute">
        <ArrowLeft size={15} /> Explore
      </Link>

      {/* Festival identity — the festival's own cover and copy, AirPal chrome stays */}
      <header className="mt-3 overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs">
        {festival.coverImage && <Photo src={festival.coverImage} alt={festival.name} className="h-44 w-full object-cover sm:h-64" />}
        <div className="p-5 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {dateRange} · {festival.city}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">{festival.name}</h1>
          {festival.tagline && <p className="mt-2 text-[16px] font-medium text-ink/80">{festival.tagline}</p>}
          {festival.description && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-mute">{festival.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mute">
            {festival.organizerName && (
              <span>
                By <span className="font-semibold text-ink">{festival.organizerName}</span>
              </span>
            )}
            {festival.venueSummary && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {festival.venueSummary}
              </span>
            )}
            {festival.admissionNote && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <Ticket size={14} /> {festival.admissionNote}
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" onClick={downloadWeek}>
              <Download size={15} /> Whole week for my calendar
            </Button>
            <Link href="/calendar?filter=going">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <CalendarDays size={15} /> My attending · {goingCount}
              </Button>
            </Link>
            {(festival.hostYourEventUrl ? (
              <a href={festival.hostYourEventUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="gap-1.5">
                  <Plus size={15} /> Host your own session
                </Button>
              </a>
            ) : (
              canManage && (
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setManageOpen(true)}>
                  <Plus size={15} /> Add a session
                </Button>
              )
            ))}
            {canManage && (
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setManageOpen((v) => !v)}>
                <Settings2 size={15} /> Manage
              </Button>
            )}
          </div>
        </div>
      </header>

      {canManage && manageOpen && (
        <FestivalManagePanel
          festival={festival}
          sessions={sessions}
          onChanged={(next) => {
            setFestival(next);
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      )}

      {user && goingCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-600/10 px-4 py-3 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-600/20">
          <Bell size={15} className="shrink-0" />
          You&apos;re attending {goingCount} {goingCount === 1 ? "session" : "sessions"} — they&apos;re in your{" "}
          <Link href="/calendar?filter=going" className="font-semibold underline">
            calendar
          </Link>
          , and your phone alerts you from there.
        </div>
      )}

      {/* Day tabs — same #day-mon … #day-sun anchors as the reference program */}
      <nav aria-label="Festival days" className="sticky top-0 z-10 -mx-4 mt-4 bg-paper/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {grouped.map(({ day, sessions: daySessions }) => (
            <button
              key={day.date}
              role="tab"
              aria-selected={typeof window !== "undefined" && window.location.hash === `#${day.anchor}`}
              onClick={() => scrollToDay(day.anchor)}
              className="flex h-11 shrink-0 flex-col items-center justify-center rounded-full bg-card px-4 ring-1 ring-line"
            >
              <span className="text-[13px] font-semibold text-ink">{day.shortLabel}</span>
              <span className="text-[10px] text-mute">
                {daySessions.length} {daySessions.length === 1 ? "session" : "sessions"}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* The program */}
      <div className="mt-2" id="program">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">The program</p>
        <h2 className="font-display text-2xl font-bold text-ink">What&apos;s on during festival week</h2>
      </div>

      {grouped.every((g) => g.sessions.length === 0) ? (
        <div className="mt-4 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <p className="font-display text-lg font-bold text-ink">Program coming soon</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Sessions are being added every week — check back, or save the festival and we&apos;ll see you here.
          </p>
        </div>
      ) : (
        grouped.map(({ day, sessions: daySessions }) =>
          daySessions.length === 0 ? null : (
            <section key={day.date} id={day.anchor} aria-label={day.label} className="scroll-mt-28 pt-6">
              <h3 className="font-display text-xl font-bold text-ink">{day.label}</h3>
              <ul className="mt-3 space-y-3">
                {daySessions.map((session) => {
                  const base = recordToCalendarBase(session);
                  const going = userStates[session.id]?.status === "going";
                  const interested = userStates[session.id]?.status === "interested";
                  return (
                    <li key={session.id} className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs sm:p-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-brand">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} /> {day.shortLabel} · {base.timeLabel}
                        </span>
                        {session.track && (
                          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px]">{session.track}</span>
                        )}
                        {(session.ticketPriceCents || 0) > 0 && (
                          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[12px] font-semibold text-ink">
                            ${(session.ticketPriceCents! / 100).toFixed(2)}
                          </span>
                        )}
                        {session.status === "draft" && (
                          <span className="rounded-full bg-paper px-2.5 py-0.5 text-[12px] text-mute ring-1 ring-line">
                            Draft
                          </span>
                        )}
                      </div>
                      <Link href={`/e/${session.id}`}>
                        <span className="mt-1 block font-display text-[19px] font-bold leading-snug text-ink">
                          {session.name}
                        </span>
                      </Link>
                      {session.hostName && (
                        <p className="mt-0.5 text-[13px] text-mute">Hosted by {session.hostName}</p>
                      )}
                      {(session.venue || session.room) &&
                        (() => {
                          const mapsUrl = eventMapsUrl(session);
                          const label = [session.venue, session.room].filter(Boolean).join(" · ");
                          return mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                            >
                              <MapPin size={14} /> {label}
                            </a>
                          ) : (
                            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-mute">
                              <MapPin size={14} /> {label}
                            </p>
                          );
                        })()}
                      {session.description && (
                        <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink/75">{session.description}</p>
                      )}
                      <SpeakerRow speakers={session.speakers} compact />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          className={cn("gap-1.5", going && "bg-emerald-600")}
                          onClick={() => toggleGoing(session.id)}
                        >
                          <Check size={15} strokeWidth={going ? 3 : 2.2} />
                          {going ? "You're going" : "Attend"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => toggleInterested(session.id)}
                          aria-pressed={interested}
                        >
                          <Heart size={15} className={interested ? "fill-brand text-brand" : ""} />
                          {interested ? "Saved" : "Save"}
                        </Button>
                        <AddToCalendarMenu
                          event={sessionPayload(session, festival.name)}
                          size="sm"
                          label="Add to calendar"
                          buttonClassName="ring-1 ring-line"
                        />
                        {session.registrationUrl ? (
                          <a href={session.registrationUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="gap-1.5">
                              <Ticket size={15} /> {session.registrationNote || "Register"}
                            </Button>
                          </a>
                        ) : (
                          <Link href="/mate/request" title="Going alone? Find an AirPal to go with">
                            <Button size="sm" variant="ghost" className="gap-1.5">
                              <Users size={15} /> Find an AirPal
                            </Button>
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
        )
      )}

      {/* Connection layer — never a bare directory */}
      <section className="mt-8 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink">Going alone?</h2>
        <p className="mt-1 text-[14px] text-mute">
          Find an AirPal to go with — say what you want to see, and who wants to join.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/mate/request">
            <Button size="sm" className="gap-1.5">
              <Users size={15} /> Find an AirPal
            </Button>
          </Link>
          <Link href="/plan/new">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <CalendarPlus size={15} /> Make a festival plan
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
