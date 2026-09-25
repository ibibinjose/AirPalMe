import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  Coffee,
  MapPin,
  MessageSquare,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import {
  recordCatchUpInterest,
  toggleCatchUpReminder,
  hasCatchUpReminder,
  checkTimeConflict,
  listCatchUps,
} from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic } from "@/lib/native";
import type { PlanType } from "@shared/plan";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface BioCatchUpModalProps {
  open: boolean;
  onClose: () => void;
  handle: string;
  name: string;
  city?: string;
  avatar?: string;
  ownerUid?: string;
  initialType?: PlanType;
}

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toZonedDateStr(d);
}

export function BioCatchUpModal({
  open,
  onClose,
  handle,
  name,
  city = "Sydney",
  avatar,
  ownerUid,
  initialType = "catchup",
}: BioCatchUpModalProps) {
  const [, nav] = useLocation();
  const { createPlan, myPlans } = usePlans();
  const { user, requireUser } = useAuth();
  const { mine } = useBio();
  const [selectedType, setSelectedType] = useState<PlanType>(initialType);
  const [date, setDate] = useState(() => localDate(1));
  const [time, setTime] = useState("14:00");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemembered, setIsRemembered] = useState(() => hasCatchUpReminder(handle));

  useEffect(() => {
    if (!open) return;
    setSelectedType(initialType);
    setDate(localDate(1));
    setTime(initialType === "meeting" ? "10:00" : initialType === "nightout" ? "18:30" : "14:00");
    setVenue(city ? `${city}` : "");
    setNotes("");
    setIsRemembered(hasCatchUpReminder(handle));

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, initialType, handle, city, onClose]);

  const typeOptions: Array<{
    type: PlanType;
    label: string;
    sublabel: string;
    icon: typeof Coffee;
    badge: string;
    color: string;
    defaultTitle: string;
  }> = [
    {
      type: "catchup",
      label: "Catch Up",
      sublabel: "1-on-1 coffee",
      icon: Coffee,
      badge: "1-on-1",
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30",
      defaultTitle: `Coffee with ${name}`,
    },
    {
      type: "meeting",
      label: "Meeting",
      sublabel: "1-on-1 sync",
      icon: Calendar,
      badge: "1-on-1",
      color: "from-sky-500/20 to-blue-500/20 text-sky-600 border-sky-500/30",
      defaultTitle: `Sync with ${name}`,
    },
    {
      type: "nightout",
      label: "Hangout",
      sublabel: "Group plan",
      icon: Users,
      badge: "Group",
      color: "from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-500/30",
      defaultTitle: `Hangout with ${name}`,
    },
  ];

  const currentOption = typeOptions.find((o) => o.type === selectedType) || typeOptions[0]!;

  // Double-booking collision detection against user's plans and existing meetups
  const conflict = checkTimeConflict(date, time, myPlans, listCatchUps());

  if (!open) return null;

  const handleToggleReminder = () => {
    void triggerHaptic("light");
    const nextState = toggleCatchUpReminder({ handle, name, photo: avatar, city });
    setIsRemembered(nextState);
    toast[nextState ? "success" : "info"](
      nextState ? `Saved a reminder to catch up with ${name}` : `Removed reminder for ${name}`,
    );
  };

  const handleLaunch = () => {
    if (!requireUser("Sign in to propose a catch-up, meeting, or hangout.")) return;
    // Re-check at click time so a stale render cannot bypass the hard block.
    const liveConflict = checkTimeConflict(date, time, myPlans, listCatchUps());
    if (liveConflict.hasConflict) {
      toast.error(
        `That time overlaps “${liveConflict.conflictingTitle}” at ${liveConflict.conflictingTime}. Pick another slot.`,
      );
      return;
    }
    const place = venue.trim() || city;
    setIsSubmitting(true);
    try {
      void triggerHaptic("success");
      const oneOnOne = selectedType !== "nightout";
      const created = createPlan({
        title: currentOption.defaultTitle,
        type: selectedType,
        theme: selectedType === "catchup" ? "emerald" : selectedType === "meeting" ? "jetblack" : "gold",
        date,
        time,
        city,
        destination: place,
        notes: notes || `With @${handle}`,
        isPublic: !oneOnOne,
        invited: [{ id: ownerUid || `h-${handle}`, name, handle }],
        initialStops:
          selectedType === "catchup"
            ? [{ name: `Coffee at ${place}`, time, notes: "Catch up", icon: "coffee", address: place }]
            : selectedType === "meeting"
              ? [{ name: `Meeting at ${place}`, time, notes: notes || "Sync", icon: "pin", address: place }]
              : [{ name: place, time, notes: "Meet here", icon: "drinks", address: place }],
      });

      recordCatchUpInterest({
        targetHandle: handle,
        targetOwnerUid: ownerUid,
        requesterUid: user?.uid,
        requesterHandle: mine?.handle,
        requesterName: mine?.name || user?.displayName || "AirPal",
        requesterPhoto: mine?.avatar,
        type: selectedType,
        date,
        time,
        venue: place,
        notes,
        planId: created.id,
      });

      toast.success(`Proposed ${currentOption.label} with ${name}`);
      onClose();
      nav(`/plan/${created.id}?share=true`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t create the plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventPayload = {
    title: `${currentOption.label} with ${name}`,
    description: `${notes || `AirPal ${currentOption.label} with @${handle}`}\nVenue: ${venue || city}\nhttps://airpal.me/@${handle}`,
    startsAt: `${date}T${time || "14:00"}:00`,
    venue: venue || city,
    city,
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-ink/65 p-4 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catchup-modal-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-paper shadow-2xl ring-1 ring-line animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-line px-6 pb-4 pt-6 bg-card/60">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-card text-mute ring-1 ring-line hover:text-ink transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-line">
              {avatar ? (
                <Photo src={avatar} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-ink font-display text-lg font-bold text-white">
                  {name[0]}
                </span>
              )}
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
                <Sparkles size={10} />
                Meet &amp; Hangout
              </p>
              <h2 id="catchup-modal-title" className="font-display text-lg font-semibold text-ink">
                Catch up or meet with {name}
              </h2>
              <p className="text-xs text-mute">@{handle}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
          {/* Double-booking Collision Warning */}
          {conflict.hasConflict && (
            <div className="rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/30 text-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Double-Booking Warning</span>
              </div>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                You already have <strong className="font-semibold">&ldquo;{conflict.conflictingTitle}&rdquo;</strong> scheduled at{" "}
                <strong className="font-semibold">{conflict.conflictingTime}</strong> on this date. Propose is blocked until you pick
                another slot.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-amber-800/80">Available slots:</span>
                {["10:00", "11:30", "15:00", "16:30", "18:00"].map((altTime) => (
                  <button
                    key={altTime}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setTime(altTime);
                    }}
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer",
                      time === altTime
                        ? "bg-amber-600 text-white"
                        : "bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30",
                    )}
                  >
                    {altTime}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Meeting Format</p>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setSelectedType(opt.type);
                    }}
                    className={cn(
                      "flex flex-col items-center rounded-2xl p-3 text-center ring-1 transition cursor-pointer active:scale-95",
                      isSelected ? "bg-card ring-brand shadow-xs" : "bg-card/60 ring-line hover:bg-card",
                    )}
                  >
                    <span className={cn("mb-1.5 rounded-xl border p-2", opt.color)}>
                      <Icon size={16} />
                    </span>
                    <span className="text-xs font-bold text-ink">{opt.label}</span>
                    <span className="mt-0.5 text-[10px] text-mute">{opt.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-3.5 text-mute" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-xs font-semibold outline-none focus:border-brand"
                />
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {[
                  ["Today", 0],
                  ["Tomorrow", 1],
                  ["Weekend", 3],
                ].map(([label, days]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setDate(localDate(Number(days)));
                    }}
                    className="rounded-lg bg-card px-2 py-0.5 text-[10px] font-semibold text-mute ring-1 ring-line hover:text-ink cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Time</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3.5 top-3.5 text-mute" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-xs font-semibold outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Where / Venue</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={city || "A café nearby"}
                className="h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-xs font-semibold outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Note / Agenda</label>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3.5 top-3 text-mute" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes, topic, or meetup idea"
                className="w-full resize-none rounded-2xl border border-line bg-card py-2.5 pl-9 pr-3 text-xs outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-line bg-card/60 p-5">
          <Button
            className="h-12 w-full gap-2 rounded-full font-bold shadow-md"
            onClick={handleLaunch}
            disabled={isSubmitting || conflict.hasConflict}
            title={conflict.hasConflict ? "Pick a free time slot before proposing" : undefined}
          >
            <Zap size={16} />
            {conflict.hasConflict ? "Pick a free time first" : "Create Plan & Propose"}
          </Button>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleReminder}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition cursor-pointer active:scale-95",
                isRemembered
                  ? "bg-amber-500/15 text-amber-800 ring-amber-500/40 font-bold"
                  : "bg-card text-ink ring-line hover:bg-paper",
              )}
            >
              <Bell size={13} className={isRemembered ? "fill-amber-500 text-amber-600" : ""} />
              {isRemembered ? "Reminder on ✓" : "Remind me"}
            </button>
            <AddToCalendarMenu
              event={eventPayload}
              size="sm"
              variant="secondary"
              label="Sync to Phone Calendar"
              buttonClassName="rounded-full text-xs font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
