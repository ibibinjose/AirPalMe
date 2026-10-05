import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useRoute, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Bell,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Pencil,
  Printer,
  QrCode,
  Radar,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/PageLoading";
import { setShareMeta } from "@/lib/share-meta";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { InvitationCard } from "@/components/plan/InvitationCard";
import { ItineraryPreview } from "@/components/plan/ItineraryPreview";
import { PlanShareModal } from "@/components/plan/PlanShareModal";
import { PlanQrModal } from "@/components/plan/PlanQrModal";
import { toPublicUrl } from "@/lib/public-origin";
import { PlanRsvpSheet } from "@/components/plan/PlanRsvpSheet";
import { PlanBroadcastSheet } from "@/components/plan/PlanBroadcastSheet";
import { PlanDatePoll } from "@/components/plan/PlanDatePoll";
import { PlanQuestionManager } from "@/components/plan/PlanQuestionManager";
import { PlanAlbum } from "@/components/plan/PlanAlbum";
import { PlanReviewPrompt } from "@/components/plan/PlanReviewPrompt";
import { PlanGroupHeader } from "@/components/plan/PlanGroupHeader";
import { PlanDiscussionWall } from "@/components/plan/PlanDiscussionWall";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { PaymentCanceledNotice } from "@/components/booking/PaymentCanceledNotice";
import { TicketGatePanel } from "@/components/booking/TicketGatePanel";
import { ticketIdFromSearch } from "@shared/booking";
import { ItineraryStopsManager } from "@/components/plan/ItineraryStopsManager";
import { ExperienceBookingModal } from "@/components/plan/ExperienceBookingModal";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { EXPERIENCE_CATEGORIES, hasTripItinerary, isSoldOut, isTicketed, type HangoutPlan } from "@shared/plan";
import { PLAN_CAPACITY_MAX, headcountLeft, headcountTaken, isPlanManager, normalizeCapacity } from "@shared/plan";
import { pendingRequests, waitlistPosition } from "@shared/plan";
import { choiceAnswerCounts, textAnswers } from "@shared/plan";
import { checkedInCount } from "@shared/plan";
import { PLAN_COHOSTS_MAX, coHostAttendees } from "@shared/plan";
import { planRatingSummary } from "@shared/plan";
import { ExperienceReviews } from "@/components/plan/ExperienceReviews";
import { TicketPass } from "@/components/plan/TicketPass";
import { TicketSalesPanel } from "@/components/plan/TicketSalesPanel";
import { TripItinerary } from "@/components/plan/TripItinerary";
import { exportPlanItineraryPdf } from "@/lib/plan-pdf";
import { NotFoundPage } from "./NotFoundPage";
import { localTodayStr, shouldAutoOpenInviteRsvp } from "@/lib/plan-invite";
import { guestListDisplay, visibleAttendees } from "@shared/plan-notify";
import { trackContentAction } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SegmentedControl } from "@/components/design-system/companions";
import { CityMap, type MapPin } from "@/components/map/CityMap";
import { knownCityCenter } from "@/lib/cities";
import { evaluatePlanHealth } from "@/lib/brain";
import { triggerHaptic } from "@/lib/native";
import { AirPalChatView } from "@/components/messaging/AirPalChatView";
import { createConversationRecord } from "@/lib/chat-store";

export function PlanDetailPage() {
  const [, paramsPlan] = useRoute("/plan/:id");
  const [, paramsInvite] = useRoute("/invite/:code");
  const [, nav] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const targetId = paramsPlan?.id || paramsInvite?.code || "";
  const {
    plans,
    getPlan,
    fetchPlan,
    rsvpPlan,
    reviewRsvp,
    submitPlanReview,
    toggleCheckIn,
    checkInSelf,
    repeatPlan,
    proposeDateOption,
    lockDateOption,
    reopenDatePoll,
    voteDateOption,
    addStop,
    updateStop,
    removeStop,
    reorderStops,
    voteStop,
    addComment,
    followPlan,
    exportIcs,
    openGoogleCalendar,
    updatePlan,
    completePlan,
    deletePlan,
  } = usePlans();
  const { user } = useAuth();
  // Gate-scan QR landings (?ticket=). Guests never fire it; the panel hides on denial.
  const ticketId = user ? ticketIdFromSearch(search) : null;

  const [localPlan, setLocalPlan] = useState<HangoutPlan | undefined>(() => getPlan(targetId));
  const [loading, setLoading] = useState(!localPlan);

  useEffect(() => {
    const p = getPlan(targetId);
    if (p) {
      setLocalPlan(p);
      setLoading(false);
    } else {
      void fetchPlan(targetId).then((fetched) => {
        setLocalPlan(fetched);
        setLoading(false);
      });
    }
  }, [targetId, getPlan, fetchPlan, plans]);

  const plan = getPlan(targetId) || localPlan;

  useEffect(() => {
    if (!plan) return;
    const where = plan.destination || plan.city || "Sydney";
    let shareImg = plan.heroImage;
    if (shareImg && shareImg.startsWith("idb:")) {
      shareImg = undefined;
    }
    if (!shareImg) {
      shareImg = "https://airpal.me/brand/og-share.jpg";
    }
    const whenStr = plan.date ? ` on ${plan.date}${plan.time ? ` at ${plan.time}` : ""}` : "";
    const description =
      `${plan.title} in ${where}${whenStr} — ${plan.notes || "Join the hangout on AirPal.Me. Life Made Easy."}`.slice(
        0,
        160,
      );

    setShareMeta({
      title: `${plan.title} · AirPal.Me`,
      description,
      image: shareImg,
      url: toPublicUrl(`/plan/${plan.id}`),
      type: "event",
      imageAlt: `${plan.title} on AirPal.Me`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Event",
        name: plan.title,
        description: plan.notes || description,
        startDate: plan.date ? `${plan.date}T${plan.time || "12:00"}:00` : undefined,
        location: {
          "@type": "Place",
          name: where,
          address: plan.destination || where,
        },
        image: shareImg ? (shareImg.startsWith("http") ? shareImg : toPublicUrl(shareImg)) : undefined,
        organizer: {
          "@type": "Person",
          name: plan.creator.name,
          url: plan.creator.handle ? toPublicUrl(`/@${plan.creator.handle}`) : undefined,
        },
      },
    });
  }, [plan]);

  const [shareOpen, setShareOpen] = useState(() => searchParams.get("share") === "true");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "plan" | "map" | "people" | "chat">("overview");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const autoRsvpShown = useRef(false);
  const arrivedViaInvite = Boolean(paramsInvite?.code);

  const bookedId = searchParams.get("booked") || "";

  const planConv = useMemo(() => {
    if (!plan) return null;
    return createConversationRecord({
      type: "plan",
      targetId: plan.id,
      title: plan.title,
      subtitle: `${plan.destination || plan.city || "Sydney"} · ${plan.date || "Upcoming"}`,
      photo: plan.heroImage,
      userUid: user?.uid || "guest",
      userName: user?.displayName || "Guest",
    });
  }, [plan, user]);

  async function handlePrintGuide() {
    if (!plan) return;
    try {
      const done = await exportPlanItineraryPdf(plan);
      toast.success(
        done === "shared"
          ? "Plan link shared — open it in Safari or Chrome to print the guide."
          : "Itinerary PDF opened for print & save!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }
  const ticketed = plan ? isTicketed(plan) : false;
  const soldOut = plan ? isSoldOut(plan) : false;

  // Creator or co-host: full management powers (host controls, reviews, check-in, polls, blasts).
  const isHost = useMemo(() => {
    if (!plan || !user) return false;
    return isPlanManager(plan, user.uid);
  }, [plan, user]);

  const userAttendee = useMemo(() => {
    if (!plan) return undefined;
    const anonId = typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null;
    return plan.attendees.find((a) => (user?.uid && a.id === user.uid) || (anonId && a.id === anonId));
  }, [plan, user]);

  // Who's-going privacy: host sees all, guests see names/counts per host toggles.
  const viewerUid = user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);
  const guestList = useMemo(
    () => (plan ? visibleAttendees(plan, { uid: viewerUid, isHost }) : []),
    [plan, viewerUid, isHost],
  );
  const guestListShowCount = !plan || isHost || guestListDisplay(plan).showCount;
  // The sheet offers going/maybe/declined — queued guests reopen it on their intent.
  const rsvpSheetStatus =
    userAttendee?.status === "maybe" || userAttendee?.status === "declined" ? userAttendee.status : "going";
  const pendingList = useMemo(() => (plan ? pendingRequests(plan) : []), [plan]);
  const ratingSummary = useMemo(() => planRatingSummary(plan ?? { attendees: [] }), [plan]);
  const crewReviews = useMemo(
    () => (plan ? plan.attendees.filter((a) => a.status === "going" && (a.rating || a.review)) : []),
    [plan],
  );
  const cohostRows = useMemo(() => (plan ? coHostAttendees(plan) : []), [plan]);
  const eligibleCohosts = useMemo(() => {
    if (!plan) return [];
    const set = new Set(plan.coHostUids || []);
    return (plan.attendees || []).filter((a) => a.status === "going" && a.id !== plan.creator.uid && !set.has(a.id));
  }, [plan]);

  const goingCount = useMemo(() => {
    if (!plan) return 0;
    return plan.attendees.filter((a) => a.status === "going").length;
  }, [plan]);

  // Invite-link arrival: open the RSVP sheet automatically (once) for guests
  // who haven't joined yet — the link does the inviting, one tap completes it.
  useEffect(() => {
    if (autoRsvpShown.current) return;
    if (ticketed) return;
    if (
      shouldAutoOpenInviteRsvp({
        arrivedViaInvite,
        planLoaded: !loading && Boolean(plan),
        isHost,
        alreadyAttendee: Boolean(userAttendee),
        planDate: plan?.date || "",
        planStatus: plan?.status || "",
        todayStr: localTodayStr(),
      })
    ) {
      autoRsvpShown.current = true;
      setRsvpOpen(true);
    }
  }, [arrivedViaInvite, loading, plan, isHost, userAttendee, ticketed]);

  const isSubscribed = useMemo(() => {
    if (!plan) return false;
    const ids = [
      user?.uid,
      // Legacy rows may hold the email instead of the uid.
      user?.email,
      typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null,
    ].filter(Boolean) as string[];
    return ids.some((id) => plan.subscribers.includes(id));
  }, [plan, user]);

  const stopPins: MapPin[] = useMemo(
    () =>
      (plan?.stops || [])
        .filter((s) => s.geo && Number.isFinite(s.geo.lat) && Number.isFinite(s.geo.lng))
        .map((s) => ({
          id: `stop-${s.id}`,
          kind: "place" as const,
          title: s.name,
          sub: s.time || s.address,
          lat: s.geo!.lat,
          lng: s.geo!.lng,
          area: false,
        })),
    [plan],
  );

  const mapCenter = useMemo(
    () =>
      (plan?.geo && Number.isFinite(plan.geo.lat) ? { lat: plan.geo.lat, lng: plan.geo.lng } : null) ||
      knownCityCenter(plan?.city) || { lat: -33.8688, lng: 151.2093 },
    [plan],
  );

  // Above the early returns: hooks must run in the same order on every render,
  // including the loading → loaded transition on cold invite-link opens.
  const brainHealth = useMemo(() => {
    if (!plan) return null;
    return evaluatePlanHealth({
      title: plan.title,
      location: plan.destination,
      date: plan.date,
      time: plan.time,
      attendeesCount: (plan.attendees || []).filter((a) => a.status === "going").length,
      isCompleted: plan.status === "completed",
    });
  }, [plan]);

  if (loading) {
    return <PageLoading />;
  }

  if (!plan) {
    return <NotFoundPage />;
  }

  const goingAttendees = guestList.filter((a) => a.status === "going");
  const maybeAttendees = guestList.filter((a) => a.status === "maybe");

  const handleDeletePlan = () => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      deletePlan(plan.id);
      nav("/plan");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 pb-32">
      <PaymentCanceledNotice />
      {ticketId && (
        <div className="mx-auto max-w-lg">
          <TicketGatePanel ticketId={ticketId} />
        </div>
      )}
      {/* Top Floating Controls — scrolls sideways on narrow phones so nothing clips */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else nav("/plan");
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line text-ink hover:bg-paper transition"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="no-scrollbar flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto py-0.5">
          {isHost && (
            <Link
              href={`/plan/${plan.id}/edit`}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
            >
              <Pencil size={13} />
              <span className="hidden sm:inline">Edit Plan</span>
            </Link>
          )}

          {isHost && (
            <button
              type="button"
              onClick={() => setBroadcastOpen(true)}
              aria-label="Message everyone going"
              title="Message everyone going"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
            >
              <Megaphone size={13} />
              <span className="hidden sm:inline">Message going</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => followPlan(plan.id)}
            aria-label={isSubscribed ? "Following event" : "Follow event"}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium ring-1 transition",
              isSubscribed
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30"
                : "bg-card text-ink ring-line hover:bg-paper",
            )}
            title="Follow event updates"
          >
            <Bell size={14} className={isSubscribed ? "fill-amber-500 text-amber-500" : ""} />
            <span className="hidden sm:inline">{isSubscribed ? "Following" : "Follow"}</span>
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setQrModalOpen(true)}
            className="gap-1.5 rounded-full h-10 px-3 text-xs font-semibold ring-1 ring-line bg-card hover:bg-line/40 text-ink shadow-xs shrink-0"
            title="In-person Dynamic QR Code"
          >
            <QrCode size={14} />
            <span className="hidden sm:inline">QR Code</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShareOpen(true)}
            className="gap-1.5 rounded-full h-10 px-4 text-xs font-semibold shadow-sm shrink-0"
          >
            <Share2 size={14} />
            <span>Invite Mates</span>
          </Button>
        </div>
      </div>

      {/* Hero — the invitation */}
      <InvitationCard
        plan={plan}
        userStatus={userAttendee ? rsvpSheetStatus : null}
        onOpenRsvp={() => setRsvpOpen(true)}
        onOpenQr={() => setQrModalOpen(true)}
        onOpenBooking={() => setBookingOpen(true)}
        viewerUid={viewerUid}
        viewerIsHost={isHost}
      />

      {/* Host Controls: Privacy toggle */}
      {isHost && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-mute">
            {plan.isPublic ? (
              <Radar size={14} className="shrink-0 text-brand" />
            ) : (
              <Lock size={14} className="shrink-0" />
            )}
            <span className="truncate">
              {plan.isPublic ? "Public · live on discover map" : "Private · invite-only"}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(plan.isPublic)}
            aria-label="Who can discover this plan"
            onClick={() => updatePlan(plan.id, { isPublic: !plan.isPublic })}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition before:absolute before:-inset-3 before:content-['']", plan.isPublic ? "bg-brand" : "bg-line")}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                plan.isPublic ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
      )}

      {/* Host Controls: who's-going visibility */}
      {isHost && (
        <div className="mt-4 rounded-2xl bg-card px-4 py-2 ring-1 ring-line">
          <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Who's going</p>
          {(
            [
              { key: "hideNames", label: "Guest names", hint: "Show who else is coming" },
              { key: "hideCount", label: "Headcount", hint: "Show going / maybe numbers" },
            ] as const
          ).map((row) => {
            const hidden = Boolean(plan.guestList?.[row.key]);
            return (
              <div key={row.key} className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">{row.label}</span>
                  <span className="block truncate text-[11px] text-mute">{row.hint}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!hidden}
                  aria-label={row.label}
                  onClick={() => updatePlan(plan.id, { guestList: { ...(plan.guestList || {}), [row.key]: !hidden } })}
                  className={cn("relative h-7 w-12 shrink-0 rounded-full transition before:absolute before:-inset-3 before:content-['']", !hidden ? "bg-brand" : "bg-line")}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                      !hidden ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-ink">Max guests</span>
              <span className="block truncate text-[11px] text-mute">
                {plan.capacity && plan.capacity > 0
                  ? `${headcountTaken(plan)} of ${plan.capacity} spots filled`
                  : "No guest limit"}
              </span>
            </span>
            <input
              key={`cap-${plan.id}-${plan.capacity ?? "open"}`}
              type="number"
              min={1}
              max={PLAN_CAPACITY_MAX}
              defaultValue={plan.capacity ?? ""}
              placeholder="No limit"
              inputMode="numeric"
              aria-label="Max guests"
              onBlur={(e) => {
                const next = normalizeCapacity(e.currentTarget.value);
                if (next !== plan.capacity) updatePlan(plan.id, { capacity: next });
                else e.currentTarget.value = plan.capacity != null ? String(plan.capacity) : "";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-11 w-24 shrink-0 rounded-2xl bg-paper px-3 text-center text-sm text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-ink">Approve guests</span>
              <span className="block truncate text-[11px] text-mute">Going taps land as requests</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(plan.requiresApproval)}
              aria-label="Approve guests"
              onClick={() => updatePlan(plan.id, { requiresApproval: !plan.requiresApproval })}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition before:absolute before:-inset-3 before:content-['']",
                plan.requiresApproval ? "bg-brand" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                  plan.requiresApproval ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* Host Controls: guest questions */}
      {isHost && (
        <div className="mt-4 rounded-2xl bg-card px-4 py-2 ring-1 ring-line">
          <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Guest questions</p>
          <PlanQuestionManager
            questions={plan.guestQuestions || []}
            onAdd={(q) =>
              updatePlan(plan.id, {
                guestQuestions: [...(plan.guestQuestions || []), { id: `q-${Date.now().toString(36)}`, ...q }],
              })
            }
            onRemove={(id) =>
              updatePlan(plan.id, { guestQuestions: (plan.guestQuestions || []).filter((q) => q.id !== id) })
            }
          />
        </div>
      )}

      {/* Close the loop — Brain north star is completed experiences */}
      {(isHost || userAttendee?.status === "going") &&
        plan.status !== "completed" &&
        plan.status !== "cancelled" &&
        plan.date <= localTodayStr() && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-brand/5 px-4 py-4 ring-1 ring-brand/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-[16px] font-semibold text-ink">Did you go?</p>
              <p className="mt-0.5 text-[13px] text-mute">
                Mark this complete so AirPal counts a real experience — not just an RSVP.
              </p>
              {isHost && checkedInCount(plan) > 0 && (
                <p className="mt-0.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {checkedInCount(plan)} checked in so far.
                </p>
              )}
            </div>
            <Button
              size="sm"
              className="h-11 shrink-0 gap-1.5 rounded-full px-5"
              onClick={() => {
                void completePlan(plan.id);
              }}
            >
              <CheckCircle2 size={16} />
              We went
            </Button>
          </div>
        )}

      {plan.status === "completed" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-200">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>
            Experience completed
            {ratingSummary.count > 0 && (
              <span className="font-semibold">
                {" "}
                · ★ {ratingSummary.average} ({ratingSummary.count} rating{ratingSummary.count === 1 ? "" : "s"})
              </span>
            )}
          </span>
          {(isHost || userAttendee?.status === "going") && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
              onClick={() => {
                const next = repeatPlan(plan.id, localTodayStr());
                if (next?.id) nav(`/plan/${next.id}?share=true`);
              }}
            >
              Do it again
            </Button>
          )}
        </div>
      )}

      {plan.status === "completed" && userAttendee?.status === "going" && userAttendee.rating === undefined && (
        <PlanReviewPrompt onSubmit={(input) => submitPlanReview(plan.id, input)} />
      )}

      {plan.status === "cancelled" && (
        <div className="mt-4 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <p className="text-[13px] font-semibold text-ink">This plan was cancelled</p>
          {plan.cancelReason && <p className="mt-0.5 text-[13px] text-mute">{plan.cancelReason}</p>}
        </div>
      )}

      {brainHealth && plan.status !== "completed" && plan.status !== "cancelled" && (
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider">
              <Sparkles size={14} className="motion-safe:animate-pulse" />
              AirPal Brain · Experience Readiness
            </span>
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
              {brainHealth.healthScore}%
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-mute">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0",
                brainHealth.readyToExperience ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            <span>
              Next: <strong className="text-ink">{brainHealth.nextBestAction}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="sticky-pagebar z-20 -mx-4 mt-6 bg-paper/95 px-4 py-2 backdrop-blur">
        <SegmentedControl
          label="Plan sections"
          value={detailTab}
          onChange={(tab) => {
            void triggerHaptic("light");
            setDetailTab(tab);
          }}
          options={[
            { id: "overview", label: "Overview" },
            { id: "plan", label: `Plan (${plan.stops.length})` },
            { id: "map", label: `Map (${stopPins.length})` },
            { id: "people", label: `People (${goingAttendees.length})` },
            { id: "chat", label: "Chat & AI" },
          ]}
        />
      </div>

      {detailTab === "overview" && (
        <>
          {/* Date poll — "when works?" before the RSVP ask */}
          <PlanDatePoll
            plan={plan}
            isHost={isHost}
            viewerUid={viewerUid}
            onVote={(optionId) => void voteDateOption(plan.id, optionId)}
            onPropose={(input) => proposeDateOption(plan.id, input)}
            onLock={(optionId) => {
              const updated = lockDateOption(plan.id, optionId);
              if (updated) setBroadcastOpen(true);
            }}
            onReopen={() => reopenDatePoll(plan.id)}
          />

          {/* RSVP Status — hidden for ticketed experiences: booking IS the RSVP */}
          {!ticketed && (
            <>
              {/* RSVP Status Highlight Strip */}
              <div className="mt-6 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-2xs",
                      userAttendee?.status === "going"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                        : userAttendee?.status === "maybe"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-paper text-mute ring-1 ring-line",
                    )}
                  >
                    {userAttendee?.status === "going" ? (
                      <CheckCircle2 size={24} />
                    ) : userAttendee?.status === "maybe" ? (
                      <HelpCircle size={24} />
                    ) : (
                      <Mail size={24} />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-mute font-bold uppercase tracking-wider">Your RSVP</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          userAttendee?.status === "going"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : userAttendee?.status === "maybe"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-paper text-mute ring-1 ring-line",
                        )}
                      >
                        {userAttendee?.status === "going"
                          ? "Attending"
                          : userAttendee?.status === "maybe"
                            ? "Tentative"
                            : "Not Responded"}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-ink mt-0.5">
                      {userAttendee?.status === "going"
                        ? "You're in for this hangout!"
                        : userAttendee?.status === "maybe"
                          ? "You marked yourself as maybe."
                          : "Are you coming along?"}
                    </p>
                    {userAttendee?.notes && <p className="text-xs text-mute italic mt-0.5">"{userAttendee.notes}"</p>}
                  </div>
                </div>

                {/* 1-Tap Quick RSVP Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("success");
                      rsvpPlan(plan.id, "going", user?.displayName || "You");
                      toast.success("You're in! RSVP set to Going 🎉");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 cursor-pointer",
                      userAttendee?.status === "going"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-paper text-ink/80 hover:bg-emerald-500/10 hover:text-emerald-600 ring-1 ring-line",
                    )}
                  >
                    <CheckCircle2 size={14} />
                    <span>Going</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      rsvpPlan(plan.id, "maybe", user?.displayName || "You");
                      toast.success("RSVP updated to Maybe");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 cursor-pointer",
                      userAttendee?.status === "maybe"
                        ? "bg-amber-700 text-white shadow-xs"
                        : "bg-paper text-ink/80 hover:bg-amber-500/10 hover:text-amber-600 ring-1 ring-line",
                    )}
                  >
                    <HelpCircle size={14} />
                    <span>Maybe</span>
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRsvpOpen(true)}
                    className="rounded-full h-8 px-3 text-xs font-semibold ring-1 ring-line text-mute hover:text-ink"
                  >
                    Add Note
                  </Button>

                  {userAttendee?.status === "going" && !userAttendee.checkedIn && (
                    <Button
                      size="sm"
                      onClick={() => checkInSelf(plan.id)}
                      className="rounded-full h-8 px-3 text-xs font-semibold"
                    >
                      We’re here
                    </Button>
                  )}
                  {userAttendee?.checkedIn && (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Checked in
                    </span>
                  )}

                  <AddToCalendarMenu
                    event={{
                      id: plan.id,
                      title: plan.title,
                      description: `${plan.notes || "Hangout on AirPal"}\n\nView plan: ${typeof window !== "undefined" ? window.location.href : ""}`,
                      startsAt: `${plan.date}T${plan.time || "14:00"}:00`,
                      venue: plan.destination,
                      city: plan.city,
                    }}
                    variant="secondary"
                    size="sm"
                    label="Sync Calendar"
                  />
                </div>
              </div>
            </>
          )}

          {/* Need company? Invite friends to this plan */}
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              nav(`/plan/${plan.id}/guests`);
            }}
            className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-line shadow-xs transition hover:ring-brand/30 active:scale-[0.99]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-xs">
              <Users size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Need company? Invite friends</span>
              <span className="block truncate text-xs text-mute">Share the invite link with your people</span>
            </span>
            <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand">
              Invite
            </span>
          </button>

          <HereCheckIn placeName={plan.destination} planId={plan.id} />

          {/* Experience Showcase & Booking Card (When plan is marked as experience) */}
          {plan.isExperience && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-amber-500/30 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
                      {plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.emoji : "✨"}{" "}
                      {plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.label : "Experience"}
                    </span>
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-mute ring-1 ring-line">
                      {plan.durationMode === "multi_day" ? "🌴 Multi-Day Retreat" : "⚡ Single-Day Event"}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mt-2">Curated Experience Pass & Pricing</h2>
                </div>

                <Button
                  onClick={() => setBookingOpen(true)}
                  disabled={soldOut}
                  className="gap-2 rounded-2xl h-11 px-5 font-bold shadow-lg bg-amber-700 text-white hover:bg-amber-800"
                >
                  <CreditCard size={16} />
                  <span>{soldOut ? "Sold out" : ticketed ? "Buy ticket" : "Book spot"}</span>
                </Button>
              </div>

              {/* Pricing Highlight Row */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-mute block">
                    Price Per Person
                  </span>
                  <p className="font-display text-2xl font-black text-ink mt-1">
                    ${plan.pricePerPerson || 0}{" "}
                    <span className="text-xs font-medium text-mute">{plan.currency || "AUD"}</span>
                  </p>
                  <p className="text-[11px] text-mute mt-0.5">
                    {plan.pricingModel === "deposit"
                      ? "Deposit balance due prior to arrival"
                      : plan.pricingModel === "tiered"
                        ? "Tiered options available below"
                        : "All inclusive fixed fee"}
                  </p>
                </div>

                {plan.depositConfig && (
                  <div className="rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                      <ShieldCheck size={15} />
                      <span>Deposit Lock-In Option</span>
                    </div>
                    <p className="font-display text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                      ${plan.depositConfig.depositAmount}{" "}
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Lock-in</span>
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      {plan.depositConfig.balanceDueDescription ||
                        `Remaining balance due ${plan.depositConfig.dueDateDaysBefore} days before start`}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-mute block">
                    Capacity & Spots
                  </span>
                  <p className="font-display text-2xl font-black text-ink mt-1">
                    {Math.max(0, (plan.capacity || 20) - goingAttendees.length)}{" "}
                    <span className="text-xs font-medium text-mute">spots left</span>
                  </p>
                  <p className="text-[11px] text-mute mt-0.5">
                    {goingAttendees.length} already booked · max capacity {plan.capacity || 20}
                  </p>
                </div>
              </div>

              {/* Pricing Tiers / Room Packages if present */}
              {plan.pricingTiers && plan.pricingTiers.length > 0 && (
                <div className="mt-6 border-t border-line/60 pt-5">
                  <h3 className="font-display text-base font-bold text-ink mb-3">Available Package & Room Tiers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plan.pricingTiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="rounded-2xl bg-paper p-4 ring-1 ring-line flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-ink">{tier.name}</h4>
                            <span className="text-sm font-black text-ink">
                              ${tier.price} {plan.currency || "AUD"}
                            </span>
                          </div>
                          {tier.description && <p className="text-xs text-mute mt-1">{tier.description}</p>}
                          {tier.depositAmount && (
                            <span className="inline-block mt-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              ${tier.depositAmount} Deposit option
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setBookingOpen(true)}
                          className="mt-3 w-full rounded-xl text-xs font-semibold"
                        >
                          Select Tier
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions Breakdown */}
              {plan.inclusions && (
                <div className="mt-6 border-t border-line/60 pt-5 space-y-4">
                  <h3 className="font-display text-base font-bold text-ink">What to Expect & Inclusions</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plan.inclusions.included && plan.inclusions.included.length > 0 && (
                      <div className="rounded-2xl bg-paper p-4 ring-1 ring-line space-y-2">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>What's Included</span>
                        </p>
                        <ul className="space-y-1.5">
                          {plan.inclusions.included.map((item, i) => (
                            <li key={i} className="text-xs text-ink/90 flex items-start gap-1.5">
                              <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.inclusions.notIncluded && plan.inclusions.notIncluded.length > 0 && (
                      <div className="rounded-2xl bg-paper p-4 ring-1 ring-line space-y-2">
                        <p className="text-xs font-bold text-mute flex items-center gap-1.5">
                          <Info size={14} />
                          <span>Not Included</span>
                        </p>
                        <ul className="space-y-1.5">
                          {plan.inclusions.notIncluded.map((item, i) => (
                            <li key={i} className="text-xs text-mute flex items-start gap-1.5">
                              <span className="text-mute shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.inclusions.whatToBring && plan.inclusions.whatToBring.length > 0 && (
                      <div className="rounded-2xl bg-paper p-4 ring-1 ring-line space-y-2">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Sparkles size={14} />
                          <span>What to Bring</span>
                        </p>
                        <ul className="space-y-1.5">
                          {plan.inclusions.whatToBring.map((item, i) => (
                            <li key={i} className="text-xs text-ink/90 flex items-start gap-1.5">
                              <Sparkles size={11} className="text-amber-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Policy */}
              {plan.bookingPolicy && (
                <div className="mt-5 rounded-2xl bg-paper/60 p-3.5 ring-1 ring-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-ink">
                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                    <span>
                      {plan.bookingPolicy.instantBooking ? "Instant Booking Confirmation" : "Host approval required"}
                      {" · "}
                      <span className="text-mute capitalize">
                        {plan.bookingPolicy.refundPolicy} cancellation policy
                      </span>
                    </span>
                  </div>
                  {plan.bookingPolicy.customTerms && (
                    <p className="text-[11px] text-mute">{plan.bookingPolicy.customTerms}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Calendar Export & Sync Actions */}
          <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
            <h2 className="font-display text-xl font-bold text-ink mt-0.5">Sync with Calendar</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => exportIcs(plan)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-paper p-3 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition active:scale-95"
              >
                <CalendarPlus size={16} className="text-brand" />
                <span>Apple / Outlook (.ics)</span>
              </button>

              <button
                type="button"
                onClick={() => openGoogleCalendar(plan)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-paper p-3 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition active:scale-95"
              >
                <Calendar size={16} className="text-brand" />
                <span>Google Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => void handlePrintGuide()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-paper p-3 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition active:scale-95 col-span-full"
              >
                <Printer size={16} className="text-amber-500" />
                <span>Print / Save Itinerary PDF Guide</span>
              </button>
            </div>
          </div>

          {bookedId ? <TicketPass bookingId={bookedId} /> : null}
          {isHost && ticketed ? <TicketSalesPanel planId={plan.id} /> : null}
          {hasTripItinerary(plan) ? <TripItinerary plan={plan} /> : null}
          {plan.isExperience ? <ExperienceReviews planId={plan.id} /> : null}

          {/* Shared album — Remember → Repeat */}
          <PlanAlbum
            plan={plan}
            canPost={Boolean(user)}
            onPostPhoto={(text, photoUrl) => addComment(plan.id, text, photoUrl)}
          />
        </>
      )}

      {detailTab === "plan" && (
        <>
          {/* Co-Planning Itinerary Stops */}
          <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
                  Co-Planning Itinerary
                </span>
                <h2 className="font-display text-xl font-bold text-ink">Planned Stops & Venues</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-mute ring-1 ring-line">
                  {plan.stops.length} {plan.stops.length === 1 ? "stop" : "stops"}
                </span>
                <button
                  type="button"
                  onClick={() => void handlePrintGuide()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-line bg-paper text-mute hover:text-ink transition active:scale-95"
                  title="Export Itinerary as PDF / Print Guide"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">PDF Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  aria-pressed={previewMode}
                  title={previewMode ? "Back to editing" : "Preview clean timeline"}
                  className={cn(
                    "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition active:scale-95",
                    previewMode ? "bg-brand text-white ring-ink" : "bg-paper text-mute ring-line hover:text-ink",
                  )}
                >
                  {previewMode ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span className="hidden sm:inline">{previewMode ? "Editing" : "Preview"}</span>
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="mt-5">
                <ItineraryPreview stops={plan.stops} />
              </div>
            ) : (
              <ItineraryStopsManager
                stops={plan.stops}
                planType={plan.type}
                baseStartTime={plan.time}
                isEditable={true}
                canVote={true}
                currentUserId={user?.uid}
                onAddStop={(stopData) => {
                  addStop(plan.id, {
                    name: stopData.name,
                    time: stopData.time,
                    icon: stopData.icon,
                    address: stopData.address,
                    notes: stopData.notes,
                    addedByName: user?.displayName || "You",
                    addedByUid: user?.uid,
                  });
                }}
                onUpdateStop={(index, patch) => {
                  const stop = plan.stops[index];
                  if (stop) updateStop(plan.id, stop.id, patch);
                }}
                onRemoveStop={(index) => {
                  const stop = plan.stops[index];
                  if (stop) removeStop(plan.id, stop.id);
                }}
                onReorderStops={(fromIdx, toIdx) => {
                  reorderStops(plan.id, fromIdx, toIdx);
                }}
                onVoteStop={(stopId) => {
                  void voteStop(plan.id, stopId);
                }}
              />
            )}
          </div>
        </>
      )}

      {detailTab === "map" && (
        <div className="mt-8">
          <div className="overflow-hidden rounded-[24px] ring-1 ring-line">
            <CityMap center={mapCenter} pins={stopPins} selectedId={selectedPin?.id} onPin={setSelectedPin} />
          </div>
          {selectedPin ? (
            <div className="mt-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="text-[15px] font-semibold">{selectedPin.title}</p>
              {selectedPin.sub && <p className="text-[13px] text-mute">{selectedPin.sub}</p>}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-mute">
              {stopPins.length > 0
                ? `${stopPins.length} ${stopPins.length === 1 ? "stop" : "stops"} mapped — tap a pin.`
                : "Stops appear here once places are added."}
            </p>
          )}
        </div>
      )}

      {detailTab === "people" && (
        <>
          <div className="mt-8">
            <PlanGroupHeader
              plan={plan}
              onInvite={() => setShareOpen(true)}
              onRsvp={() => setRsvpOpen(true)}
              viewerUid={viewerUid}
              viewerIsHost={isHost}
            />
          </div>

          {/* Host Controls: co-hosts */}
          {isHost && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Crew</span>
              <h2 className="font-display text-xl font-bold text-ink">Co-hosts</h2>
              <p className="mt-0.5 text-[13px] text-mute">Co-hosts can manage, message, check in and lock dates.</p>
              {cohostRows.length > 0 && (
                <div className="mt-4 space-y-2">
                  {cohostRows.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                          {att.name.charAt(0)}
                        </span>
                        <p className="truncate text-xs sm:text-sm font-semibold text-ink">{att.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updatePlan(plan.id, { coHostUids: (plan.coHostUids || []).filter((id) => id !== att.id) })
                        }
                        aria-label={`Remove co-host ${att.name}`}
                        className="inline-flex h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold text-mute ring-1 ring-line hover:text-ink transition active:scale-95"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {eligibleCohosts.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink/80 mb-1.5">Add from going</p>
                  <div className="space-y-2">
                    {eligibleCohosts.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                            {att.name.charAt(0)}
                          </span>
                          <p className="truncate text-xs sm:text-sm font-semibold text-ink">{att.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(plan.coHostUids || []), att.id];
                            if (next.length > PLAN_COHOSTS_MAX) {
                              toast.message(`Up to ${PLAN_COHOSTS_MAX} co-hosts.`);
                              return;
                            }
                            updatePlan(plan.id, { coHostUids: next });
                          }}
                          aria-label={`Make ${att.name} a co-host`}
                          className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Host Controls: door guestlist */}
          {isHost && plan && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Door</span>
              <h2 className="font-display text-xl font-bold text-ink">Guestlist</h2>
              <p className="mt-0.5 text-[13px] text-mute">
                RSVPs and ticket buyers land here. Check guests in, add walk-ins, close the list after.
              </p>
              <Link
                href={`/plan/${plan.id}/guests`}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand/90 active:scale-95"
              >
                Open guestlist
              </Link>
            </div>
          )}

          {/* Host Controls: join requests */}
          {isHost && pendingList.length > 0 && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Requests</span>
              <h2 className="font-display text-xl font-bold text-ink">Requests to join</h2>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {pendingList.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                        {att.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-ink">
                          {att.name}
                          {att.plusOnes ? <span className="text-mute font-normal"> +{att.plusOnes}</span> : null}
                        </p>
                        {att.notes && <p className="truncate text-[11px] text-mute">{att.notes}</p>}
                        {(plan.guestQuestions || []).map((q) => {
                          const v = att.answers?.[q.id];
                          if (!v) return null;
                          return (
                            <p key={q.id} className="truncate text-[11px] text-mute">
                              {q.question} — <span className="font-medium text-ink/80">{v}</span>
                            </p>
                          );
                        })}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => reviewRsvp(plan.id, att.id, "decline")}
                        aria-label={`Decline ${att.name}`}
                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs font-semibold text-mute ring-1 ring-line hover:bg-line/40 transition active:scale-95"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewRsvp(plan.id, att.id, "approve")}
                        aria-label={`Approve ${att.name}`}
                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
                      >
                        Approve
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host Controls: guest answers */}
          {isHost && (plan.guestQuestions || []).length > 0 && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Guest answers</span>
              <h2 className="font-display text-xl font-bold text-ink">What the crew said</h2>
              <div className="mt-4 space-y-4">
                {(plan.guestQuestions || []).map((q) => {
                  const counts = q.type === "choice" ? choiceAnswerCounts(q, plan.attendees) : [];
                  const texts = q.type === "text" ? textAnswers(q, plan.attendees).slice(0, 10) : [];
                  if (q.type === "text" && !texts.length) return null;
                  return (
                    <div key={q.id}>
                      <p className="text-xs font-semibold text-ink">{q.question}</p>
                      {q.type === "choice" ? (
                        <div className="mt-1.5 space-y-1">
                          {counts.map(({ option, count }) => (
                            <div key={option} className="flex items-center gap-2 text-[11px]">
                              <span className="w-32 shrink-0 truncate text-mute">{option}</span>
                              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                                <span
                                  className="block h-full rounded-full bg-brand"
                                  style={{
                                    width: `${Math.round((count / Math.max(1, goingAttendees.length)) * 100)}%`,
                                  }}
                                />
                              </span>
                              <span className="w-6 shrink-0 text-right font-semibold text-ink">{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="mt-1.5 space-y-1">
                          {texts.map((t, i) => (
                            <li key={i} className="truncate text-[11px] text-mute">
                              “{t}”
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Controls: crew reviews */}
          {isHost && crewReviews.length > 0 && (
            <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Crew reviews</span>
              <h2 className="font-display text-xl font-bold text-ink">
                ★ {ratingSummary.average} · {ratingSummary.count} rating{ratingSummary.count === 1 ? "" : "s"}
              </h2>
              <ul className="mt-4 space-y-2">
                {crewReviews.map((att) => (
                  <li key={att.id} className="rounded-2xl bg-paper px-3.5 py-2.5 ring-1 ring-line">
                    <p className="text-xs font-semibold text-ink">
                      {att.name}
                      {att.rating !== undefined && <span className="text-mute font-normal"> · ★ {att.rating}</span>}
                    </p>
                    {att.review && <p className="mt-0.5 text-[13px] leading-5 text-ink/80">{att.review}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attendees Guest List */}
          <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Guest List</span>
                <h2 className="font-display text-xl font-bold text-ink">Mates Attending</h2>
              </div>
              <div className="flex items-center gap-2">
                {guestListShowCount ? (
                  <>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                      {goingAttendees.length} Going
                    </span>
                    {maybeAttendees.length > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                        {maybeAttendees.length} Maybe
                      </span>
                    )}
                    {isHost && goingAttendees.length > 0 && (
                      <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand ring-1 ring-brand/20">
                        {checkedInCount(plan)}/{goingAttendees.length} checked in
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-mute ring-1 ring-line">
                    Guest list private
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {guestList.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                      {att.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold text-ink">
                        {att.name}
                        {att.plusOnes ? <span className="text-mute font-normal"> +{att.plusOnes}</span> : null}
                        {att.handle && <span className="text-mute font-normal"> (@{att.handle})</span>}
                        {plan.coHostUids?.includes(att.id) && (
                          <span className="ml-1.5 rounded-full bg-brand/10 px-2 py-0.2 text-[10px] font-medium text-brand">
                            Co-host
                          </span>
                        )}
                      </p>
                      {att.notes && <p className="truncate text-[11px] text-mute">{att.notes}</p>}
                    </div>
                  </div>

                  <span className="flex shrink-0 items-center gap-1">
                    {isHost && att.status === "going" && (
                      <button
                        type="button"
                        onClick={() => toggleCheckIn(plan.id, att.id)}
                        aria-pressed={Boolean(att.checkedIn)}
                        aria-label={att.checkedIn ? `Uncheck ${att.name}` : `Check in ${att.name}`}
                        title={att.checkedIn ? "Checked in" : "Check in"}
                        className={cn(
                          "grid h-11 w-11 place-items-center rounded-full ring-1 transition active:scale-95",
                          att.checkedIn
                            ? "bg-emerald-500 text-white ring-emerald-500"
                            : "text-mute ring-line hover:bg-paper hover:text-ink",
                        )}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0",
                        att.status === "going"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : att.status === "maybe"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-paper text-mute",
                      )}
                    >
                      {att.status === "waitlisted"
                        ? `waitlisted · #${waitlistPosition(plan, att.id) ?? "–"}`
                        : att.status === "pending"
                          ? "awaiting host"
                          : att.status}
                    </span>
                    {userAttendee && att.id !== userAttendee.id && (
                      <SafetyMenu targetUid={att.id} targetName={att.name} planId={plan.id} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Plan Chat & Copilot Banner */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl bg-brand/5 p-4 ring-1 ring-brand/20">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-xs">
                <MessageSquare size={18} />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-ink">Plan Chat & AirPal AI</p>
                <p className="text-xs text-mute">
                  Coordinate with attendees in real-time or ask AirPal AI for suggestions
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                void triggerHaptic("light");
                setDetailTab("chat");
              }}
              className="rounded-full px-4 text-xs font-semibold shrink-0"
            >
              Open Chat
            </Button>
          </div>

          {/* Discussion Wall & Activity Stream */}
          <div className="mt-6">
            <PlanDiscussionWall
              plan={plan}
              onPostComment={(text, photoUrl) => {
                void addComment(plan.id, text, photoUrl);
              }}
            />
          </div>
        </>
      )}

      {detailTab === "chat" && planConv && (
        <div className="mt-6 overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs min-h-[520px] flex flex-col">
          <AirPalChatView conversation={planConv} />
        </div>
      )}

      {isHost && (
        <div className="mt-8 border-t border-line/60 pt-6 flex justify-end">
          <button
            type="button"
            onClick={handleDeletePlan}
            className="text-xs font-semibold text-red-500 hover:text-red-600 transition inline-flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            <span>Delete Hangout Plan</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <PlanShareModal plan={plan} open={shareOpen} onClose={() => setShareOpen(false)} canInvite={isHost} />
      <PlanQrModal plan={plan} isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />

      <PlanBroadcastSheet
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        planId={plan.id}
        planTitle={plan.title}
        goingCount={goingCount}
      />

      <PlanRsvpSheet
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        currentStatus={rsvpSheetStatus}
        currentNotes={userAttendee?.notes}
        currentPlusOnes={userAttendee?.plusOnes}
        spotsLeft={headcountLeft(plan)}
        requiresApproval={plan.requiresApproval}
        questions={plan.guestQuestions}
        currentAnswers={userAttendee?.answers}
        onSubmit={async (status, name, notes, plusOnes, answers) => {
          const updated = await rsvpPlan(plan.id, status, name, notes, plusOnes, answers);
          if (updated) setLocalPlan(updated);
        }}
      />

      <ExperienceBookingModal
        plan={plan}
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBookingSuccess={(details) => {
          // Paid Stripe booking = qualified guest action on the plan's QR context.
          trackContentAction("booking_intent", plan.id, {
            contentId: plan.id,
            category: "experience",
            destination: "stripe",
          });
          rsvpPlan(
            plan.id,
            "going",
            user?.displayName || "You",
            `Booked ${details.spots} spot${details.spots > 1 ? "s" : ""} (${details.isDeposit ? "Deposit Paid" : "Paid in Full"})`,
          );
        }}
      />
    </div>
  );
}
