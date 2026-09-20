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
  Pencil,
  Printer,
  QrCode,
  Radar,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { setShareMeta } from "@/lib/share-meta";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { InvitationCard } from "@/components/plan/InvitationCard";
import { ItineraryPreview } from "@/components/plan/ItineraryPreview";
import { PlanShareModal } from "@/components/plan/PlanShareModal";
import { PlanQrModal } from "@/components/plan/PlanQrModal";
import { PlanRsvpSheet } from "@/components/plan/PlanRsvpSheet";
import { PlanGroupHeader } from "@/components/plan/PlanGroupHeader";
import { PlanDiscussionWall } from "@/components/plan/PlanDiscussionWall";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ItineraryStopsManager } from "@/components/plan/ItineraryStopsManager";
import { ExperienceBookingModal } from "@/components/plan/ExperienceBookingModal";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { EXPERIENCE_CATEGORIES, isSoldOut, isTicketed, type HangoutPlan } from "@shared/plan";
import { TicketPass } from "@/components/plan/TicketPass";
import { TicketSalesPanel } from "@/components/plan/TicketSalesPanel";
import { exportPlanItineraryPdf } from "@/lib/plan-pdf";
import { NotFoundPage } from "./NotFoundPage";
import { localTodayStr, shouldAutoOpenInviteRsvp } from "@/lib/plan-invite";
import { trackContentAction } from "@/lib/analytics";
import { cn } from "@/lib/cn";

export function PlanDetailPage() {
  const [, paramsPlan] = useRoute("/plan/:id");
  const [, paramsInvite] = useRoute("/invite/:code");
  const [, nav] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const targetId = paramsPlan?.id || paramsInvite?.code || "";
  const {
    getPlan,
    fetchPlan,
    rsvpPlan,
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
    deletePlan,
  } = usePlans();
  const { user } = useAuth();

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
  }, [targetId, getPlan, fetchPlan]);

  const plan = getPlan(targetId) || localPlan;

  useEffect(() => {
    if (!plan) return;
    const where = plan.destination || plan.city || "Sydney";
    setShareMeta({
      title: `${plan.title} · AirPal`,
      description:
        `${plan.title} in ${where}${plan.date ? ` on ${plan.date}` : ""} — join the plan on AirPal.Me.`.slice(0, 160),
      image: plan.heroImage || undefined,
      url: `${window.location.origin}/plan/${plan.id}`,
    });
  }, [plan]);

  const [shareOpen, setShareOpen] = useState(() => searchParams.get("share") === "true");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const autoRsvpShown = useRef(false);
  const arrivedViaInvite = Boolean(paramsInvite?.code);

  const bookedId = searchParams.get("booked") || "";
  const ticketed = plan ? isTicketed(plan) : false;
  const soldOut = plan ? isSoldOut(plan) : false;

  const isHost = useMemo(() => {
    if (!plan || !user) return false;
    return Boolean(plan.creator.uid && plan.creator.uid === user.uid);
  }, [plan, user]);

  const userAttendee = useMemo(() => {
    if (!plan) return undefined;
    const anonId = typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null;
    return plan.attendees.find((a) => (user?.uid && a.id === user.uid) || (anonId && a.id === anonId));
  }, [plan, user]);

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
    const id =
      user?.email || user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);
    return Boolean(id && plan.subscribers.includes(id));
  }, [plan, user]);

  if (loading) {
    return <PageLoading />;
  }

  if (!plan) {
    return <NotFoundPage />;
  }

  const goingAttendees = plan.attendees.filter((a) => a.status === "going");
  const maybeAttendees = plan.attendees.filter((a) => a.status === "maybe");

  const handleDeletePlan = () => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      deletePlan(plan.id);
      nav("/plan");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 pb-32">
      {/* Top Floating Controls */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else nav("/plan");
          }}
          className="grid h-10 w-10 place-items-center rounded-full bg-card ring-1 ring-line text-ink hover:bg-paper transition"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          {isHost && (
            <Link
              href={`/plan/${plan.id}/edit`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
            >
              <Pencil size={13} />
              <span className="hidden sm:inline">Edit Plan</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => followPlan(plan.id)}
            aria-label={isSubscribed ? "Following event" : "Follow event"}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium ring-1 transition",
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
            className="gap-1.5 rounded-full h-10 px-3 text-xs font-semibold ring-1 ring-line bg-card hover:bg-line/40 text-ink shadow-xs"
            title="In-person Dynamic QR Code"
          >
            <QrCode size={14} />
            <span className="hidden sm:inline">QR Code</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShareOpen(true)}
            className="gap-1.5 rounded-full h-10 px-4 text-xs font-semibold shadow-sm"
          >
            <Share2 size={14} />
            <span>Invite Mates</span>
          </Button>
        </div>
      </div>

      {/* WhatsApp-Style Group Header Bar */}
      <div className="mb-6">
        <PlanGroupHeader plan={plan} onInvite={() => setShareOpen(true)} onRsvp={() => setRsvpOpen(true)} />
      </div>

      {/* Main Luxury Digital VIP Invitation Card */}
      <InvitationCard
        plan={plan}
        userStatus={userAttendee?.status}
        onOpenRsvp={() => setRsvpOpen(true)}
        onOpenQr={() => setQrModalOpen(true)}
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
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition", plan.isPublic ? "bg-brand" : "bg-line")}
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

      {/* RSVP Status Highlight Strip */}
      <div className="mt-6 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-2xl",
              userAttendee?.status === "going"
                ? "bg-emerald-500/10 text-emerald-600"
                : userAttendee?.status === "maybe"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-paper text-mute",
            )}
          >
            {userAttendee?.status === "going" ? (
              <CheckCircle2 size={22} />
            ) : userAttendee?.status === "maybe" ? (
              <HelpCircle size={22} />
            ) : (
              <Mail size={22} />
            )}
          </span>
          <div>
            <p className="text-xs text-mute font-medium">Your RSVP Status</p>
            <p className="text-sm font-semibold text-ink">
              {userAttendee?.status === "going"
                ? "You're in — see you there! 🎉"
                : userAttendee?.status === "maybe"
                  ? "Marked as Maybe"
                  : "Not responded yet"}
            </p>
            {userAttendee?.notes && <p className="text-xs text-mute italic mt-0.5">"{userAttendee.notes}"</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          {ticketed && (
            <Button
              size="sm"
              disabled={soldOut}
              onClick={() => setBookingOpen(true)}
              className="rounded-full shrink-0 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:from-amber-600 hover:to-amber-700"
            >
              <CreditCard size={14} />
              <span>
                {soldOut
                  ? "Sold out"
                  : plan.pricingModel === "deposit" && plan.depositConfig
                    ? `Reserve • $${plan.depositConfig.depositAmount}`
                    : `Buy ticket • $${plan.pricePerPerson || 0}`}
              </span>
            </Button>
          )}

          {!ticketed && (
            <Button
              variant={userAttendee ? "ghost" : "primary"}
              size="sm"
              onClick={() => setRsvpOpen(true)}
              className="rounded-full shrink-0"
            >
              {userAttendee ? "Change RSVP" : "RSVP (Free)"}
            </Button>
          )}
        </div>
      </div>

      <HereCheckIn placeName={plan.destination} planId={plan.id} />

      {/* Experience Showcase & Booking Card (When plan is marked as experience) */}
      {plan.isExperience && (
        <div className="mt-8 rounded-3xl bg-gradient-to-b from-card via-card to-paper p-6 ring-1 ring-amber-500/30 shadow-md">
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
              className="gap-2 rounded-2xl h-11 px-5 font-bold shadow-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
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
                  <span className="text-mute capitalize">{plan.bookingPolicy.refundPolicy} cancellation policy</span>
                </span>
              </div>
              {plan.bookingPolicy.customTerms && (
                <p className="text-[11px] text-mute">{plan.bookingPolicy.customTerms}</p>
              )}
            </div>
          )}
        </div>
      )}

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
              onClick={() => exportPlanItineraryPdf(plan)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-line bg-paper text-mute hover:text-ink transition active:scale-95"
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
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition active:scale-95",
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
              voteStop(plan.id, stopId);
            }}
          />
        )}
      </div>

      {/* Attendees Guest List */}
      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Guest List</span>
            <h2 className="font-display text-xl font-bold text-ink">Mates Attending</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
              {goingAttendees.length} Going
            </span>
            {maybeAttendees.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                {maybeAttendees.length} Maybe
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {plan.attendees.map((att) => (
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
                    {att.handle && <span className="text-mute font-normal"> (@{att.handle})</span>}
                  </p>
                  {att.notes && <p className="truncate text-[11px] text-mute">{att.notes}</p>}
                </div>
              </div>

              <span className="flex shrink-0 items-center gap-1">
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
                  {att.status}
                </span>
                {userAttendee && att.id !== userAttendee.id && (
                  <SafetyMenu targetUid={att.id} targetName={att.name} planId={plan.id} />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion Wall & Activity Stream */}
      <div className="mt-8">
        <PlanDiscussionWall
          plan={plan}
          onPostComment={(text, photoUrl) => {
            addComment(plan.id, text, photoUrl);
          }}
        />
      </div>

      {/* Calendar Export & Sync Actions */}
      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Add to Your Schedule</span>
        <h2 className="font-display text-xl font-bold text-ink mt-0.5">Sync with Calendar</h2>
        <p className="text-xs text-mute mt-1">
          Export full event with all planned stops directly into Apple Calendar, Google Calendar, or Outlook.
        </p>

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
            onClick={() => exportPlanItineraryPdf(plan)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-paper p-3 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition active:scale-95 col-span-full"
          >
            <Printer size={16} className="text-amber-500" />
            <span>Print / Save Itinerary PDF Guide</span>
          </button>
        </div>
      </div>

      {/* Host Danger Zone (Delete) */}
      {bookedId ? <TicketPass bookingId={bookedId} /> : null}
      {isHost && ticketed ? <TicketSalesPanel planId={plan.id} /> : null}

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

      {/* Sticky Mobile Bottom Floating Action Bar */}
      <div className="fixed-element fixed inset-x-0 bottom-0 z-40 p-3 bg-paper/90 backdrop-blur-xl border-t border-line sm:hidden safe-bottom">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Button
            onClick={() => setShareOpen(true)}
            variant="ghost"
            className="flex-1 rounded-full h-11 text-xs font-semibold gap-1.5 ring-1 ring-line"
          >
            <Share2 size={15} />
            <span>Share Link</span>
          </Button>

          {ticketed ? (
            <Button
              onClick={() => setBookingOpen(true)}
              disabled={soldOut}
              className="flex-1 rounded-full h-11 text-xs font-semibold gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-amber-600 text-white"
            >
              <CreditCard size={15} />
              <span>
                {soldOut
                  ? "Sold out"
                  : plan.pricingModel === "deposit" && plan.depositConfig
                    ? `Reserve $${plan.depositConfig.depositAmount}`
                    : `Buy $${plan.pricePerPerson || 0}`}
              </span>
            </Button>
          ) : (
            <Button
              onClick={() => setRsvpOpen(true)}
              aria-label={userAttendee?.status === "going" ? "Going" : "RSVP Now"}
              className="flex-1 rounded-full h-11 text-xs font-semibold gap-1.5 shadow-md"
            >
              {userAttendee?.status === "going" ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Going</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>RSVP</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      <PlanShareModal plan={plan} open={shareOpen} onClose={() => setShareOpen(false)} />
      <PlanQrModal plan={plan} isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />

      <PlanRsvpSheet
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        currentStatus={userAttendee?.status}
        currentNotes={userAttendee?.notes}
        onSubmit={(status, name, notes) => {
          rsvpPlan(plan.id, status, name, notes);
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
