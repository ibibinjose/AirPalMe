import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Calendar, Clock, Coffee, MapPin, MessageSquare, Sparkles, Users, X, Zap } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { recordCatchUpInterest, toggleCatchUpReminder, hasCatchUpReminder } from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
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
  const { createPlan } = usePlans();
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
  }, [open, initialType, handle, city]);

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

  if (!open) return null;

  const handleToggleReminder = () => {
    const nextState = toggleCatchUpReminder({ handle, name, photo: avatar, city });
    setIsRemembered(nextState);
    toast[nextState ? "success" : "info"](
      nextState ? `Saved a reminder to catch up with ${name}` : `Removed reminder for ${name}`,
    );
  };

  const handleLaunch = () => {
    if (!requireUser("Sign in to propose a catch-up, meeting, or hangout.")) return;
    const place = venue.trim() || city;
    setIsSubmitting(true);
    try {
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

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/65 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catchup-modal-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-paper shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-line px-6 pb-4 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-card text-mute ring-1 ring-line hover:text-ink"
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
                Meet &amp; hangout
              </p>
              <h2 id="catchup-modal-title" className="font-display text-lg font-semibold text-ink">
                Catch up or meet with {name}
              </h2>
              <p className="text-xs text-mute">@{handle}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">How</p>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={cn(
                      "flex flex-col items-center rounded-2xl p-3 text-center ring-1 transition",
                      isSelected ? "bg-card ring-brand" : "bg-card/60 ring-line hover:bg-card",
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
                ].map(([label, days]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => setDate(localDate(Number(days)))}
                    className="rounded-lg bg-card px-2 py-0.5 text-[10px] font-semibold text-mute ring-1 ring-line hover:text-ink"
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
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Where</label>
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
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">Note</label>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3.5 top-3 text-mute" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="w-full resize-none rounded-2xl border border-line bg-card py-2.5 pl-9 pr-3 text-xs outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-line bg-card/40 p-5">
          <Button className="h-12 w-full gap-2 rounded-full" onClick={handleLaunch} disabled={isSubmitting}>
            <Zap size={16} />
            Create plan
          </Button>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleReminder}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
                isRemembered ? "bg-amber-500/15 text-amber-800 ring-amber-500/30" : "bg-card text-ink ring-line",
              )}
            >
              <Bell size={13} />
              {isRemembered ? "Reminder on" : "Remind me"}
            </button>
            <AddToCalendarMenu
              event={eventPayload}
              size="sm"
              variant="ghost"
              label="Sync Calendar"
              buttonClassName="rounded-full text-xs font-semibold text-mute hover:text-ink"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
