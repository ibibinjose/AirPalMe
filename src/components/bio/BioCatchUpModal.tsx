import { useState } from "react";
import { useLocation } from "wouter";
import {
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
} from "@/lib/catchup";
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
  initialType?: PlanType;
}

export function BioCatchUpModal({
  open,
  onClose,
  handle,
  name,
  city = "Sydney",
  avatar,
  initialType = "catchup",
}: BioCatchUpModalProps) {
  const [, nav] = useLocation();
  const { createPlan } = usePlans();
  const { requireUser } = useAuth();

  const [selectedType, setSelectedType] = useState<PlanType>(initialType);

  const getLocalDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [date, setDate] = useState(() => getLocalDate(1)); // Tomorrow
  const [time, setTime] = useState("14:00");
  const [venue, setVenue] = useState(`${city} Precinct`);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

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
      label: "1-on-1 Catch Up",
      sublabel: "Coffee, drinks or casual lunch sync",
      icon: Coffee,
      badge: "Casual",
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30",
      defaultTitle: `Coffee & Catch Up with ${name}`,
    },
    {
      type: "meeting",
      label: "Book a Meeting",
      sublabel: "1-on-1 discussion, sync or advisory",
      icon: Calendar,
      badge: "Sync",
      color: "from-sky-500/20 to-blue-500/20 text-sky-600 border-sky-500/30",
      defaultTitle: `Meeting & Sync with ${name}`,
    },
    {
      type: "nightout",
      label: "Group Hangout",
      sublabel: "Drinks, dining or group outing with the crew",
      icon: Users,
      badge: "Group",
      color: "from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-500/30",
      defaultTitle: `Hangout & Outing with ${name}`,
    },
  ];

  const currentOption = typeOptions.find((o) => o.type === selectedType) || typeOptions[0];

  const { mine } = useBio();
  const [isRemembered, setIsRemembered] = useState(() => hasCatchUpReminder(handle));

  const handleToggleReminder = () => {
    const nextState = toggleCatchUpReminder({
      handle,
      name,
      photo: avatar,
      city,
    });
    setIsRemembered(nextState);
    if (nextState) {
      toast.success(`Saved reminder to catch up with ${name}!`);
    } else {
      toast.info(`Removed catch up reminder for ${name}`);
    }
  };

  const handleLaunch = () => {
    if (!requireUser("Sign in to create and invite friends to Hangout Plans.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const planTitle = currentOption.defaultTitle;
      const initialStops =
        selectedType === "catchup"
          ? [
              { name: `Coffee & Catch Up at ${venue}`, time, notes: "Catch up and good conversation", icon: "coffee", address: venue },
              { name: "Laneway Walk & Chat", notes: "Scenic walk together", icon: "walk" },
            ]
          : selectedType === "meeting"
            ? [
                { name: `Meeting at ${venue}`, time, notes: notes || "Agenda review & discussion", icon: "pin", address: venue },
                { name: "Action Items & Wrap Up", notes: "Next steps", icon: "pin" },
              ]
            : [
                { name: `Meeting Spot: ${venue}`, time, notes: "Gather and say cheers", icon: "drinks", address: venue },
                { name: "Dinner & Banter", notes: "Great food and music", icon: "food" },
              ];

      const created = createPlan({
        title: planTitle,
        type: selectedType,
        theme: selectedType === "catchup" ? "emerald" : selectedType === "meeting" ? "jetblack" : "gold",
        date,
        time,
        city,
        destination: venue,
        notes: notes || `Inviting @${handle} (${name}) to meet up and hangout!`,
        isPublic: true,
        initialStops,
      });

      // Also record catch-up interest so recipient sees in their inbox
      recordCatchUpInterest({
        targetHandle: handle,
        requesterHandle: mine?.handle,
        requesterName: mine?.name || "Friend on AirPal",
        requesterPhoto: mine?.avatar,
        type: selectedType,
        date,
        time,
        venue,
        notes,
      });

      toast.success(`Hangout Plan created with @${handle}!`);
      onClose();
      nav(`/plan/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullBuilder = () => {
    onClose();
    nav(`/plan/new?with=${handle}&name=${encodeURIComponent(name)}&type=${selectedType}&city=${encodeURIComponent(city)}`);
  };

  // Construct calendar payload for instant calendar sync
  const eventPayload = {
    title: `${currentOption.label}: ${name} & Me`,
    description: `${notes || `AirPal Catch Up with @${handle}`}\n\nVenue: ${venue}\nOrganised on https://airpal.me/@${handle}`,
    startsAt: `${date}T${time || "14:00"}:00`,
    venue,
    city,
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/65 p-4 backdrop-blur-sm sm:p-6 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catchup-modal-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-paper shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="relative bg-gradient-to-r from-card via-paper to-card px-6 pt-6 pb-4 border-b border-line/60">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink hover:bg-paper transition"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-gold/40 shadow-sm shrink-0">
              {avatar ? (
                <Photo src={avatar} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-ink font-display text-lg font-bold text-white">
                  {name[0]}
                </span>
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                <Sparkles size={10} />
                Hangout & Catch Up
              </div>
              <h2 id="catchup-modal-title" className="font-display mt-0.5 text-lg font-bold text-ink truncate">
                Meet with {name}
              </h2>
              <p className="text-xs text-mute font-medium">@{handle} · {city}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Meeting Type Selection */}
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-2">
              Choose Meeting Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative",
                      isSelected
                        ? "bg-card border-brand shadow-sm ring-1 ring-brand/30"
                        : "bg-card/50 border-line hover:bg-card hover:border-line/80",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={cn("p-1.5 rounded-xl border", opt.color)}>
                        <Icon size={16} />
                      </div>
                      <span className="text-[10px] font-semibold text-mute">{opt.badge}</span>
                    </div>
                    <span className="text-xs font-bold text-ink block">{opt.label}</span>
                    <span className="text-[11px] text-mute leading-tight mt-0.5">{opt.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">
                Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-3.5 text-mute" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-card pl-9 pr-3 text-xs font-semibold text-ink ring-1 ring-line outline-none focus:ring-brand"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setDate(getLocalDate(0))}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getLocalDate(1))}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getLocalDate(3))}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  Weekend
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">
                Time
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3.5 top-3.5 text-mute" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-card pl-9 pr-3 text-xs font-semibold text-ink ring-1 ring-line outline-none focus:ring-brand"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTime("10:00")}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => setTime("14:00")}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  2:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => setTime("18:30")}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-card ring-1 ring-line text-mute hover:text-ink"
                >
                  6:30 PM
                </button>
              </div>
            </div>
          </div>

          {/* Suggested Venue / Meeting Point */}
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">
              Venue / Meeting Point
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-3.5 text-gold" />
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. The Rocks Café, Sydney"
                className="h-11 w-full rounded-2xl bg-card pl-9 pr-3 text-xs font-semibold text-ink ring-1 ring-line outline-none focus:ring-brand"
              />
            </div>
          </div>

          {/* Notes / Agenda */}
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">
              Personal Note or Agenda (Optional)
            </label>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3.5 top-3 text-mute" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`e.g. Looking forward to chatting about upcoming collabs!`}
                className="w-full rounded-2xl bg-card pl-9 pr-3 py-2.5 text-xs text-ink ring-1 ring-line outline-none focus:ring-brand resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer / CTAs */}
        <div className="p-6 bg-card/50 border-t border-line/60 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              type="button"
              className="w-full sm:flex-1 h-12 rounded-full bg-ink text-white font-semibold text-sm gap-2 shadow-md hover:bg-ink/90 active:scale-[0.99]"
              onClick={handleLaunch}
              disabled={isSubmitting}
            >
              <Zap size={16} className="text-gold" />
              <span>Create & Launch Plan</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto h-12 rounded-full border border-line bg-card text-ink font-semibold text-xs px-4 hover:bg-paper"
              onClick={handleFullBuilder}
            >
              Full Plan Builder →
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/40">
            {/* Remember to Catch Up Toggle */}
            <button
              type="button"
              onClick={handleToggleReminder}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95",
                isRemembered
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-700"
                  : "bg-card border-line text-ink hover:bg-paper",
              )}
            >
              <Bell size={13} className={isRemembered ? "text-amber-500 fill-amber-500" : "text-mute"} />
              <span>{isRemembered ? "Remembered to Catch Up" : "Remember to Catch Up"}</span>
            </button>

            {/* Direct Calendar Sync Menu */}
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
