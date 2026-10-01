import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Calendar, CreditCard, MapPin, Sparkles, CheckCircle2, QrCode } from "lucide-react";
import { type HangoutPlan, PLAN_THEMES, PLAN_TYPES, formatPlanDate, isTicketed, isSoldOut } from "@shared/plan";
import { guestListDisplay, visibleAttendees } from "@shared/plan-notify";
import { PLAN_TYPE_ICONS } from "./planTypeIcons";
import { PlanQrModal } from "./PlanQrModal";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { PlaceAddressLink } from "@/components/forms/PlaceAddressField";

export function InvitationCard({
  plan,
  userStatus,
  onOpenRsvp,
  onOpenQr,
  onOpenBooking,
  viewerUid,
  viewerIsHost,
}: {
  plan: HangoutPlan;
  userStatus?: "going" | "maybe" | "declined" | null;
  onOpenRsvp?: () => void;
  onOpenQr?: () => void;
  onOpenBooking?: () => void;
  viewerUid?: string | null;
  viewerIsHost?: boolean;
}) {
  const theme = PLAN_THEMES[plan.theme] || PLAN_THEMES.gold;
  const typeInfo = PLAN_TYPES[plan.type] || PLAN_TYPES.custom;
  const [showQrModal, setShowQrModal] = useState(false);

  const handleOpenQr = () => {
    void triggerHaptic("light");
    if (onOpenQr) onOpenQr();
    else setShowQrModal(true);
  };

  // Who's-going privacy: host sees all, guests see the redacted list.
  const attendees = useMemo(
    () => visibleAttendees(plan, { uid: viewerUid, isHost: viewerIsHost }),
    [plan, viewerUid, viewerIsHost],
  );
  const showCount = viewerIsHost || guestListDisplay(plan).showCount;
  const goingCount = useMemo(() => attendees.filter((a) => a.status === "going").length, [attendees]);

  const countdown = useMemo(() => {
    try {
      const target = new Date(`${plan.date}T${plan.time}:00`);
      if (Number.isNaN(target.getTime())) return "";
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) return "Happening Now";
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 0) return `Today at ${plan.time}`;
      if (diffDays === 1) return `Tomorrow at ${plan.time}`;
      return `In ${diffDays} days`;
    } catch {
      return "";
    }
  }, [plan.date, plan.time]);

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] p-6 shadow-2xl transition-all duration-300 md:p-8",
          "bg-gradient-to-br ring-1 backdrop-blur-xl",
          theme.bgClass,
          theme.borderClass,
          theme.onThemeClass,
        )}
        style={{
          boxShadow: `0 20px 40px -15px ${theme.foilGlow}, inset 0 1px 1px rgba(255,255,255,0.2)`,
        }}
      >
        {/* Background Holographic Sheen */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: theme.accentColor }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: theme.accentColor }}
        />
        {theme.id === "holographic" && (
          <>
            <div className="pointer-events-none absolute -left-10 top-0 h-full w-24 rotate-12 bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute left-1/3 top-0 h-full w-10 rotate-12 bg-cyan-200/15 blur-lg" />
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.14)_45%,transparent_60%)]" />
          </>
        )}

        {/* Header Cover Photo if set */}
        {plan.heroImage ? (
          <div className="relative -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-5 aspect-square max-h-[560px] w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] overflow-hidden">
            <img src={plan.heroImage} alt={plan.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/40 to-transparent" />
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/25 shadow-sm">
                {(() => {
                  const TypeIcon = PLAN_TYPE_ICONS[plan.type] || Sparkles;
                  return <TypeIcon size={14} />;
                })()}
                <span>{typeInfo.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenQr}
                  title="Share in person as QR Code"
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/25 shadow-sm transition active:scale-95"
                >
                  <QrCode size={13} className="text-amber-300" />
                  <span>Share QR</span>
                </button>

                {countdown && (
                  <span className="hidden sm:inline-block rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/20 shadow-sm">
                    {countdown}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Top Bar: Occasion Badge & QR Button */
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/25">
              {(() => {
                const TypeIcon = PLAN_TYPE_ICONS[plan.type] || Sparkles;
                return <TypeIcon size={14} />;
              })()}
              <span>{typeInfo.label}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenQr}
                title="Share in person as QR Code"
                className="inline-flex items-center gap-1.5 rounded-full bg-black/30 hover:bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/25 transition active:scale-95"
              >
                <QrCode size={13} className="text-amber-300" />
                <span>Share as QR</span>
              </button>

              {countdown && (
                <span
                  className={cn(
                    "hidden sm:inline-block rounded-full bg-black/30 px-3 py-1 text-xs font-medium backdrop-blur-md ring-1 ring-white/25",
                    theme.onThemeClass,
                  )}
                >
                  {countdown}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Title & Host */}
        <div className="mt-5">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]",
              theme.onThemeMutedClass,
            )}
          >
            <span>Invitation from</span>
            {plan.creator.handle ? (
              <Link
                href={`/@${plan.creator.handle}`}
                className={cn(
                  "font-bold underline decoration-white/30 underline-offset-2 hover:decoration-white transition",
                  theme.onThemeClass,
                )}
              >
                {plan.creator.name} (@{plan.creator.handle})
              </Link>
            ) : (
              <strong className={cn("font-bold", theme.onThemeClass)}>{plan.creator.name}</strong>
            )}
            {theme.id === "holographic" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white ring-1 ring-white/40">
                <Sparkles size={11} />
                VIP
              </span>
            )}
          </div>
          <h1 className="font-display mt-1.5 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{plan.title}</h1>
          {plan.notes && (
            <p className={cn("mt-2.5 text-xs sm:text-sm leading-relaxed max-w-xl", theme.onThemeMutedClass)}>
              {plan.notes}
            </p>
          )}
        </div>

        {/* Details Grid */}
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur-md">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/20 text-white">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[11px] uppercase tracking-wider", theme.onThemeMutedClass)}>When</p>
              <p className="truncate text-sm font-semibold">{formatPlanDate(plan.date, plan.time)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur-md">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/20 text-white">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[11px] uppercase tracking-wider", theme.onThemeMutedClass)}>Where</p>
              <p className="truncate text-sm font-semibold">
                <PlaceAddressLink label={plan.destination || plan.city} geo={plan.geo} />
              </p>
            </div>
          </div>
        </div>

        {/* Attendees summary & RSVP strip (WhatsApp group style) */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/25 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5 overflow-hidden">
              {attendees.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  className={cn(
                    "relative grid h-9 w-9 place-items-center rounded-full bg-black/25 text-[11px] font-bold uppercase shadow-xs ring-2 ring-white/50",
                    theme.onThemeClass,
                    att.status === "going" ? "border-b-2 border-emerald-400" : "",
                  )}
                  title={`${att.name} (${att.status})`}
                >
                  {att.avatar ? (
                    <img src={att.avatar} alt={att.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span>{att.name.charAt(0)}</span>
                  )}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-1 ring-white/60",
                      att.status === "going"
                        ? "bg-emerald-400"
                        : att.status === "maybe"
                          ? "bg-amber-400"
                          : "bg-zinc-400",
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <span className={cn("text-xs font-medium block", theme.onThemeMutedClass)}>
                {showCount ? (
                  <>
                    <strong className={cn("font-semibold", theme.onThemeClass)}>{goingCount} going</strong>
                    {attendees.length > goingCount ? ` · ${attendees.length - goingCount} maybe` : ""}
                  </>
                ) : (
                  "Guest list private"
                )}
              </span>
              <span className={cn("text-[11px] truncate block max-w-xs", theme.onThemeMutedClass)}>
                {attendees
                  .map((a) => a.name)
                  .slice(0, 3)
                  .join(", ")}
                {showCount && attendees.length > 3 ? ` +${attendees.length - 3}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenQr}
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold bg-black/30 hover:bg-black/40 text-white ring-1 ring-white/30 backdrop-blur-md transition active:scale-95 shadow-sm"
            >
              <QrCode size={14} className="text-amber-300" />
              <span>Share as QR</span>
            </button>

            {onOpenRsvp && (
              <button
                type="button"
                onClick={onOpenRsvp}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition active:scale-95 shadow-md",
                  userStatus === "going"
                    ? "bg-emerald-500 text-white ring-2 ring-emerald-400"
                    : userStatus === "maybe"
                      ? "bg-amber-500 text-white ring-2 ring-amber-400"
                      : "bg-white text-ink hover:bg-white/90",
                )}
              >
                {userStatus === "going" ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>You're Going! (Change)</span>
                  </>
                ) : userStatus === "maybe" ? (
                  <span>Marked as Maybe (Change)</span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>RSVP</span>
                  </>
                )}
              </button>
            )}
            {onOpenBooking && isTicketed(plan) && (
              <button
                type="button"
                onClick={onOpenBooking}
                disabled={isSoldOut(plan)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <CreditCard size={14} />
                <span>
                  {isSoldOut(plan)
                    ? "Sold out"
                    : plan.pricingModel === "deposit" && plan.depositConfig
                      ? `Reserve $${plan.depositConfig.depositAmount}`
                      : `Buy $${plan.pricePerPerson || 0}`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic In-Person QR Modal */}
      {showQrModal && <PlanQrModal plan={plan} isOpen={showQrModal} onClose={() => setShowQrModal(false)} />}
    </>
  );
}
