import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Eye,
  Lock,
  MapPin,
  Palette,
  Radar,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ACTIVITY_INTERESTS,
  PLAN_COVER_PRESETS,
  PLAN_THEMES,
  PLAN_TYPES,
  reorderStops,
  type HangoutPlan,
  type PlanTheme,
  type PlanType,
  type StopIconType,
} from "@shared/plan";
import { InvitationCard } from "@/components/plan/InvitationCard";
import { ItineraryPreview } from "@/components/plan/ItineraryPreview";
import type { Geo } from "@shared/nearby";
import { PLAN_TYPE_ICONS } from "@/components/plan/planTypeIcons";
import { ItineraryStopsManager } from "@/components/plan/ItineraryStopsManager";
import { ExperiencePricingManager, type ExperiencePricingData } from "@/components/plan/ExperiencePricingManager";
import { ImageField } from "@/components/media/ImageField";
import { usePlans } from "@/contexts/PlanContext";
import { useListings } from "@/contexts/ListingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { activePlaces } from "@/lib/catalog";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export function PlanCreatePage() {
  const [, nav] = useLocation();
  const { createPlan } = usePlans();
  const { user, authReady } = useAuth();
  const { version: catalogVersion } = useListings();
  const nearbySuggestions = useMemo(() => activePlaces().slice(0, 6), [catalogVersion]);

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const targetHandle = searchParams.get("with") || undefined;
  const targetName = searchParams.get("name") || undefined;
  const paramType = (searchParams.get("type") as PlanType) || undefined;
  const initialType: PlanType = paramType && PLAN_TYPES[paramType] ? paramType : "nightout";

  const [type, setType] = useState<PlanType>(initialType);
  const [theme, setTheme] = useState<PlanTheme>(
    initialType === "catchup" ? "emerald" : initialType === "meeting" ? "jetblack" : "gold",
  );
  const [title, setTitle] = useState(() => {
    if (targetHandle) {
      if (initialType === "catchup") return `Coffee & Catch Up with ${targetName || `@${targetHandle}`}`;
      if (initialType === "meeting") return `1-on-1 Meeting with ${targetName || `@${targetHandle}`}`;
      return `Hangout Plan with ${targetName || `@${targetHandle}`}`;
    }
    return PLAN_TYPES[initialType].defaultTitle;
  });
  const [titleTouched, setTitleTouched] = useState(Boolean(targetHandle));
  const [activeOccasionTab, setActiveOccasionTab] = useState<"all" | "milestone" | "social" | "trip">("all");
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);

  const toLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = toLocalDate(new Date());

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); // Next Friday
    return toLocalDate(d);
  });
  const [time, setTime] = useState("18:30");
  const [endTime, setEndTime] = useState("23:00");
  const [city] = useState(searchParams.get("city") || "Sydney");
  const [destination, setDestination] = useState(searchParams.get("destination") || "The Rocks, Sydney Harbour");
  const [notes, setNotes] = useState(() => {
    if (targetHandle) {
      return `Inviting @${targetHandle} (${targetName || `@${targetHandle}`}) to meet up, discuss, and hangout!`;
    }
    return "Meeting up for sunset rooftop drinks, sandstone pub dining, and live music with the crew!";
  });

  const [heroImage, setHeroImage] = useState<string | undefined>(
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  );

  const [stops, setStops] = useState<Array<{ name: string; time?: string; notes?: string; icon?: StopIconType | string; address?: string; placeId?: string }>>(() => {
    if (initialType === "catchup") {
      return [
        { name: "Coffee & Greeting", time: "14:00", notes: "Grab flat whites and catch up", icon: "coffee", address: "The Rocks, Sydney" },
        { name: "Laneway Walk & Chat", time: "14:45", notes: "Scenic promenade stroll", icon: "walk" },
      ];
    }
    if (initialType === "meeting") {
      return [
        { name: "Meeting & Discussion", time: "10:00", notes: "Agenda review & discussion", icon: "pin", address: "The Rocks, Sydney" },
        { name: "Action Items & Wrap Up", time: "10:45", notes: "Next steps & calendar follow-ups", icon: "pin" },
      ];
    }
    return [
      { name: "The Glenmore Rooftop", time: "18:30", notes: "Rooftop sunset drinks & harbour views", icon: "drinks", address: "96 Cumberland St, The Rocks" },
      { name: "Fortune of War", time: "20:00", notes: "Dinner & sandstone beer garden", icon: "food", address: "137 George St, The Rocks" },
    ];
  });

  const [isPublic, setIsPublic] = useState(true);
  const [interests, setInterests] = useState<string[]>(["nightlife", "food"]);
  const [pin] = useState<Geo | undefined>(undefined);

  // Experience Marketplace Settings
  const [experienceData, setExperienceData] = useState<ExperiencePricingData>({
    isExperience: false,
    experienceCategory: "social",
    durationMode: "single_day",
    pricingModel: "fixed",
    pricePerPerson: 45,
    currency: "AUD",
    capacity: 20,
    depositConfig: {
      depositAmount: 15,
      dueDateDaysBefore: 7,
      balanceDueDescription: "Remaining balance due 7 days prior to start",
    },
    pricingTiers: [],
    inclusions: {
      included: ["Local host & curated itinerary", "Welcome drink or appetiser"],
      notIncluded: ["Personal transport", "Additional food & beverages"],
      whatToBring: ["Comfortable shoes", "ID / Confirmation Pass"],
    },
    bookingPolicy: {
      instantBooking: true,
      refundPolicy: "moderate",
      customTerms: "Free cancellation up to 48 hours before the start date.",
    },
  });

  // Live card & plan preview
  const previewPlan: HangoutPlan = useMemo(() => {
    const now = new Date().toISOString();
    return {
      id: "plan-preview",
      title: title.trim() || PLAN_TYPES[type].defaultTitle,
      type,
      theme,
      creator: { name: "You" },
      date,
      time,
      endTime: endTime.trim() || undefined,
      datetime: `${date}T${time}:00`,
      city: "Sydney",
      destination,
      heroImage,
      notes: notes.trim() || undefined,
      stops: stops.map((s, i) => ({
        id: `preview-stop-${i}`,
        name: s.name,
        time: s.time,
        notes: s.notes,
        icon: s.icon,
        address: s.address,
      })),
      attendees: [{ id: "preview-host", name: "You", status: "going", respondedAt: now }],
      comments: [],
      subscribers: [],
      inviteCode: "PREVIEW",
      status: "open",
      isPublic,
      interests,
      createdAt: now,
      updatedAt: now,

      // Experience preview properties
      isExperience: experienceData.isExperience,
      experienceCategory: experienceData.experienceCategory,
      durationMode: experienceData.durationMode,
      endDate: experienceData.endDate,
      pricingModel: experienceData.pricingModel,
      pricePerPerson: experienceData.pricePerPerson,
      currency: experienceData.currency,
      capacity: experienceData.capacity,
      depositConfig: experienceData.depositConfig,
      pricingTiers: experienceData.pricingTiers,
      inclusions: experienceData.inclusions,
      bookingPolicy: experienceData.bookingPolicy,
    };
  }, [
    title,
    type,
    theme,
    date,
    time,
    endTime,
    destination,
    heroImage,
    notes,
    stops,
    isPublic,
    interests,
    experienceData,
  ]);

  const handleTypeSelect = (newType: PlanType) => {
    void triggerHaptic("medium");
    setType(newType);
    const meta = PLAN_TYPES[newType];
    if (!titleTouched) setTitle(meta.defaultTitle);

    // Auto-suggest matching cover preset
    const matchingPreset = PLAN_COVER_PRESETS.find(
      (p) =>
        (newType === "birthday" && p.id.includes("birthday")) ||
        (newType === "wedding" && p.id.includes("wedding")) ||
        (newType === "graduation" && p.id.includes("graduation")) ||
        (newType === "housewarming" && p.id.includes("housewarming")) ||
        (newType === "baby_shower" && p.id.includes("baby")) ||
        (newType === "memorial" && p.id.includes("memorial")) ||
        (newType === "anniversary" && p.id.includes("anniversary")) ||
        (newType === "escape" && p.id.includes("escape")) ||
        (newType === "trip" && p.id.includes("trip")) ||
        (newType === "nightout" && p.id.includes("nightout")) ||
        (newType === "lunch" && p.id.includes("lunch")) ||
        (newType === "gig" && p.id.includes("music")),
    );
    if (matchingPreset) setHeroImage(matchingPreset.url);

    if (meta.suggestedStops.length > 0) {
      const defaultIconFor = (i: number): StopIconType => {
        if (newType === "birthday") return i === 0 ? "drinks" : i === 1 ? "food" : "cake";
        if (newType === "wedding") return i === 0 ? "ceremony" : i === 1 ? "photo" : i === 2 ? "speech" : "toast";
        if (newType === "graduation") return i === 0 ? "ceremony" : i === 1 ? "photo" : "food";
        if (newType === "housewarming") return i === 0 ? "home" : i === 1 ? "food" : "toast";
        if (newType === "baby_shower") return i === 0 ? "coffee" : i === 1 ? "gift" : "cake";
        if (newType === "memorial") return i === 0 ? "ceremony" : "toast";
        if (newType === "anniversary") return i === 0 ? "toast" : i === 1 ? "food" : "speech";
        if (newType === "escape") return i === 0 ? "petrol" : i === 1 ? "stay" : "food";
        if (newType === "trip") return i === 0 ? "petrol" : i === 1 ? "sight" : "food";
        if (newType === "lunch") return i === 0 ? "coffee" : i === 1 ? "food" : "walk";
        if (newType === "nightout") return i === 0 ? "drinks" : i === 1 ? "food" : "music";
        if (newType === "gig") return i === 0 ? "drinks" : i === 1 ? "music" : "food";
        if (newType === "walk") return i === 0 ? "coffee" : i === 1 ? "walk" : "food";
        return i === 0 ? "coffee" : i === 1 ? "food" : "pin";
      };

      setStops(
        meta.suggestedStops.map((name, i) => ({
          name,
          time: i === 0 ? "18:30" : i === 1 ? "20:00" : i === 2 ? "21:30" : "22:30",
          icon: defaultIconFor(i),
        })),
      );
    }
  };

  const handleAddStop = (newStop: { name: string; time?: string; notes?: string; icon?: StopIconType | string; address?: string }) => {
    setStops([...stops, newStop]);
  };

  const handleUpdateStop = (index: number, patch: Partial<{ name: string; time?: string; notes?: string; icon?: StopIconType | string; address?: string }>) => {
    setStops(stops.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleReorderStops = (fromIdx: number, toIdx: number) => {
    setStops(reorderStops(stops, fromIdx, toIdx));
  };

  // Quick Date Helpers
  const setQuickDate = (daysAhead: number) => {
    void triggerHaptic("light");
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(toLocalDate(d));
  };

  const setNextWeekday = (dayOfWeek: number) => {
    void triggerHaptic("light");
    const d = new Date();
    const current = d.getDay();
    const diff = (dayOfWeek - current + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setDate(toLocalDate(d));
  };

  // Precinct Presets
  const PRECINCTS = [
    { name: "The Rocks & Harbour", label: "The Rocks & Harbour" },
    { name: "Surry Hills & Crown St", label: "Surry Hills" },
    { name: "Barangaroo Waterfront", label: "Barangaroo" },
    { name: "Bondi Beach & Coast", label: "Bondi Beach" },
    { name: "Manly Wharf & Ocean", label: "Manly" },
    { name: "Newtown & King St", label: "Newtown" },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    void triggerHaptic("success");

    try {
      const fallbackMeta = PLAN_TYPES[type] || PLAN_TYPES.nightout;
      const finalTitle = (title || "").trim() || fallbackMeta.defaultTitle;
      const finalDate = date || todayStr;
      const finalTime = time || "18:30";
      const finalDest = (destination || "").trim() || "The Rocks & Circular Quay, Sydney";

      const created = createPlan({
        title: finalTitle,
        type,
        theme,
        date: finalDate,
        time: finalTime,
        endTime: endTime.trim() || undefined,
        city: city || "Sydney",
        destination: finalDest,
        heroImage,
        notes: notes.trim() || undefined,
        isPublic,
        interests,
        geo: pin,
        initialStops: stops,

        // Experience Marketplace Fields
        isExperience: Boolean(experienceData.isExperience),
        experienceCategory: experienceData.isExperience ? experienceData.experienceCategory : undefined,
        durationMode: experienceData.isExperience ? experienceData.durationMode : undefined,
        endDate: experienceData.isExperience ? experienceData.endDate : undefined,
        pricingModel: experienceData.isExperience ? experienceData.pricingModel : undefined,
        pricePerPerson: experienceData.isExperience ? experienceData.pricePerPerson : undefined,
        currency: experienceData.isExperience ? experienceData.currency : undefined,
        capacity: experienceData.isExperience ? experienceData.capacity : undefined,
        depositConfig: experienceData.isExperience ? experienceData.depositConfig : undefined,
        pricingTiers: experienceData.isExperience ? experienceData.pricingTiers : undefined,
        inclusions: experienceData.isExperience ? experienceData.inclusions : undefined,
        bookingPolicy: experienceData.isExperience ? experienceData.bookingPolicy : undefined,
      });

      if (created && created.id) {
        nav(`/plan/${created.id}?share=true`);
      } else {
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  // Filtered Occasions
  const filteredPlanTypes = useMemo(() => {
    const keys = Object.keys(PLAN_TYPES) as PlanType[];
    if (activeOccasionTab === "milestone") return keys.filter((k) => PLAN_TYPES[k].category === "Life Milestone");
    if (activeOccasionTab === "social") return keys.filter((k) => PLAN_TYPES[k].category === "Social Outing" && !["trip", "escape"].includes(k));
    if (activeOccasionTab === "trip") return keys.filter((k) => ["trip", "escape", "walk"].includes(k) || PLAN_TYPES[k].category === "Community");
    return keys;
  }, [activeOccasionTab]);

  if (!authReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-mute">
        <Sparkles size={24} className="mx-auto mb-2 text-gold animate-pulse" />
        <span>Loading AirPal Studio…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        next="/plan/new"
        kicker="AirPal Studio"
        title="Create your Hangout Plan"
        lede="Sign in or create your free AirPal.me account to craft custom hangout plans, build multi-stop itineraries, and invite guests with VIP passes."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 pb-36">
      {/* Top Header & Live Preview Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else nav("/plan");
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-card ring-1 ring-line text-ink hover:bg-paper transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
              <Sparkles size={12} />
              <span>AirPal Studio · Hangout Builder</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">Create a Plan</h1>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setShowLivePreviewModal(true)}
          variant="ghost"
          className="gap-1.5 rounded-full h-10 px-3.5 text-xs font-bold ring-1 ring-line bg-card hover:bg-paper text-ink shadow-xs"
        >
          <Eye size={14} className="text-brand" />
          <span className="hidden sm:inline">Live Card Preview</span>
        </Button>
      </div>

      {targetHandle && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gold/10 p-3.5 ring-1 ring-gold/30">
          <div className="p-2 rounded-xl bg-gold/20 text-gold-dark">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ink">
              Inviting {targetName || `@${targetHandle}`} (@{targetHandle})
            </p>
            <p className="text-[11px] text-mute truncate">
              This hangout plan is pre-linked to meet up with @{targetHandle}.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Step 1: Choose Plan Format */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 1</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                    experienceData.isExperience
                      ? "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30",
                  )}
                >
                  {experienceData.isExperience ? "Paid / Experience" : "Free Social RSVP"}
                </span>
              </div>
              <label className="font-display text-lg font-semibold text-ink block">
                1. Is this a Free Hangout or Paid Experience?
              </label>
              <p className="text-xs text-mute mt-0.5">
                Choose how guests will RSVP or book into this event
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Event Type">
            {/* Free Social Hangout */}
            <button
              type="button"
              role="radio"
              aria-checked={!experienceData.isExperience}
              onClick={() => {
                void triggerHaptic("medium");
                setExperienceData((prev) => ({
                  ...prev,
                  isExperience: false,
                  pricingModel: "free",
                }));
              }}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition active:scale-[0.98] ring-1 relative overflow-hidden",
                !experienceData.isExperience
                  ? "bg-emerald-500/10 text-ink ring-2 ring-emerald-500 shadow-sm"
                  : "bg-paper text-mute ring-line hover:text-ink hover:bg-line/40",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl transition group-hover:scale-110">🎉</span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    !experienceData.isExperience
                      ? "bg-emerald-600 text-white"
                      : "bg-line/60 text-mute",
                  )}
                >
                  Free RSVP
                </span>
              </div>
              <div>
                <span className="font-display text-base font-bold text-ink block">
                  Free Social Hangout / Gathering
                </span>
                <p className="text-xs text-mute mt-1 leading-relaxed">
                  Default RSVP (Going / Maybe / Decline), milestone celebrations, casual mates catchups, split costs casually.
                </p>
              </div>
            </button>

            {/* Paid / Bookable Experience — live with pay-later bookings; cards via Stripe later */}
            <button
              type="button"
              role="radio"
              aria-checked={experienceData.isExperience}
              onClick={() => {
                void triggerHaptic("medium");
                setExperienceData((prev) => ({
                  ...prev,
                  isExperience: true,
                  pricingModel: prev.pricingModel === "free" ? "fixed" : prev.pricingModel,
                }));
              }}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition active:scale-[0.98] ring-1 relative overflow-hidden",
                experienceData.isExperience
                  ? "bg-brand/5 text-ink ring-2 ring-brand shadow-sm"
                  : "bg-paper text-mute ring-line hover:text-ink hover:bg-line/40",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <Ticket size={22} className={experienceData.isExperience ? "text-brand" : undefined} />
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    experienceData.isExperience ? "bg-brand text-white" : "bg-line/60 text-mute",
                  )}
                >
                  Pay later
                </span>
              </div>
              <div>
                <span className="font-display text-base font-bold text-ink block">
                  Paid / Bookable Experience
                </span>
                <p className="text-xs text-mute mt-1 leading-relaxed">
                  Ticketed bookings, guided tours, retreats, workshops & deposits. Guests book now, pay later — cards arrive with Stripe.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: What's the Occasion */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 2</span>
                <span className="text-xs font-semibold text-brand">· {PLAN_TYPES[type]?.label}</span>
              </div>
              <label className="font-display text-lg font-semibold text-ink block">2. What’s the occasion?</label>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-paper ring-1 ring-line overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All" },
                { id: "milestone", label: "Milestones" },
                { id: "social", label: "Social" },
                { id: "trip", label: "Trips & Tours" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setActiveOccasionTab(tab.id as any);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-1 text-xs font-bold transition whitespace-nowrap",
                    activeOccasionTab === tab.id
                      ? "bg-card text-ink shadow-xs ring-1 ring-line"
                      : "text-mute hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Occasions Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {filteredPlanTypes.map((tKey) => {
              const item = PLAN_TYPES[tKey];
              const Icon = PLAN_TYPE_ICONS[tKey];
              const isSelected = type === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => handleTypeSelect(tKey)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex flex-col items-center gap-2.5 rounded-2xl p-3.5 text-center transition active:scale-95 ring-1 relative group",
                    isSelected
                      ? "bg-brand/10 text-ink ring-2 ring-brand shadow-sm font-semibold"
                      : "bg-paper text-mute ring-line hover:text-ink hover:bg-line/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl transition group-hover:scale-105",
                      isSelected ? "bg-brand text-white shadow-xs" : "bg-line/60 text-ink",
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="text-xs font-bold text-ink leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: When & Where */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 3</span>
            <label className="font-display text-lg font-semibold text-ink block mt-0.5">3. When and where?</label>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Plan Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              placeholder="e.g. Friday Sunset Drinks in The Rocks"
              className="h-11 w-full rounded-2xl bg-paper px-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand font-medium text-ink"
            />
          </div>

          {/* Quick Date Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-ink/80">Quick Date</label>
              <span className="text-[11px] text-brand font-semibold">{date}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-line/40 active:scale-95"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-line/40 active:scale-95"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setNextWeekday(5)}
                className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-line/40 active:scale-95"
              >
                This Friday
              </button>
              <button
                type="button"
                onClick={() => setNextWeekday(6)}
                className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-line/40 active:scale-95"
              >
                This Saturday
              </button>
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink/80 block mb-1">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="date"
                  required
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink/80 block mb-1">Start Time</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink/80 block mb-1">End Time (Optional)</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink"
                />
              </div>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: "☕ 9:30am Coffee", t: "09:30" },
              { label: "🥗 12:30pm Lunch", t: "12:30" },
              { label: "🍸 6:00pm Drinks", t: "18:00" },
              { label: "🍽️ 7:30pm Dinner", t: "19:30" },
              { label: "🌙 9:00pm Late", t: "21:00" },
            ].map((preset) => (
              <button
                key={preset.t}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setTime(preset.t);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  time === preset.t
                    ? "bg-brand text-white shadow-xs"
                    : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Destination with Sydney Precinct Chips */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Destination / Precinct</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. The Rocks & Circular Quay, Sydney"
                className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRECINCTS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setDestination(p.name);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                    destination.includes(p.label)
                      ? "bg-brand/10 text-brand ring-1 ring-brand/30"
                      : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                  )}
                >
                  📍 {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Host Message / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What should mates know? e.g. Dress code, meeting spot, bring swimmers, etc."
              className="w-full rounded-2xl bg-paper p-3.5 text-xs md:text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink leading-relaxed"
            />
          </div>
        </div>

        {/* Step 4: Cover Banner & Theme Palette */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 4</span>
              <label className="font-display text-lg font-semibold text-ink block mt-0.5">4. Cover Banner & Theme</label>
            </div>
            {heroImage && (
              <button
                type="button"
                onClick={() => setHeroImage(undefined)}
                className="text-xs text-mute hover:text-red-500 font-medium transition"
              >
                Clear photo
              </button>
            )}
          </div>

          {/* Header Preview */}
          {heroImage ? (
            <div className="relative h-44 w-full overflow-hidden rounded-2xl ring-1 ring-line shadow-inner">
              <img src={heroImage} alt="Plan Cover Header" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <span className="text-xs font-bold text-white/90">Selected Header Banner</span>
              </div>
            </div>
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-paper ring-1 ring-dashed ring-line text-xs text-mute">
              No photo selected (holographic gradient theme will be used)
            </div>
          )}

          {/* Theme Palette Swatches */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/80 mb-2">
              <Palette size={14} className="text-gold" />
              <span>Invitation Theme Palette</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(PLAN_THEMES) as PlanTheme[]).map((themeKey) => {
                const isSelected = theme === themeKey;
                const themeMeta = PLAN_THEMES[themeKey];
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setTheme(themeKey);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-2xl ring-1 transition active:scale-95 text-center",
                      isSelected
                        ? "bg-card ring-2 ring-brand shadow-sm font-bold"
                        : "bg-paper text-mute ring-line hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full ring-2 ring-white/50 shadow-xs flex items-center justify-center text-[10px] text-white",
                        themeKey === "gold" && "bg-gradient-to-br from-amber-400 to-amber-600",
                        themeKey === "midnight" && "bg-gradient-to-br from-slate-800 to-indigo-950",
                        themeKey === "sunset" && "bg-gradient-to-br from-amber-500 to-rose-600",
                        themeKey === "emerald" && "bg-gradient-to-br from-emerald-400 to-teal-700",
                        themeKey === "holographic" && "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-amber-400",
                        themeKey === "hotpink" && "bg-gradient-to-br from-pink-400 to-rose-600",
                        themeKey === "champagne" && "bg-gradient-to-br from-amber-200 to-amber-400 text-ink",
                        themeKey === "celestial" && "bg-gradient-to-br from-indigo-400 to-purple-800",
                        themeKey === "fluro" && "bg-gradient-to-br from-lime-400 to-emerald-500 text-ink",
                        themeKey === "jetblack" && "bg-gradient-to-br from-zinc-700 to-zinc-950",
                      )}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                    <span className="text-[11px] truncate w-full">{themeMeta?.name || themeKey}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-2">Curated Cover Photos:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLAN_COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setHeroImage(preset.url)}
                  className={cn(
                    "group relative h-16 rounded-xl overflow-hidden text-left ring-1 transition active:scale-95",
                    heroImage === preset.url ? "ring-2 ring-brand shadow-sm" : "ring-line opacity-80 hover:opacity-100",
                  )}
                >
                  <img src={preset.url} alt={preset.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-1.5 flex flex-col justify-end">
                    <span className="text-[10px] font-semibold text-white truncate leading-tight">{preset.title}</span>
                    <span className="text-[9px] text-white/70 truncate">{preset.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Upload or URL */}
          <div className="pt-2 border-t border-line/60">
            <p className="text-[11px] font-medium text-mute mb-2">Or paste image URL / upload from device:</p>
            <input
              type="url"
              value={heroImage || ""}
              onChange={(e) => setHeroImage(e.target.value.trim() || undefined)}
              placeholder="Paste image URL (https://...)"
              className="h-10 w-full rounded-2xl bg-paper px-3.5 text-xs ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="mt-2.5">
              <ImageField
                kind="cover"
                value={heroImage}
                onChange={(url) => setHeroImage(url)}
              />
            </div>
          </div>
        </div>

        {/* Step 5: Itinerary Stops & Schedule */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 5</span>
              <label className="font-display text-lg font-semibold text-ink block mt-0.5">5. Itinerary Stops & Schedule</label>
              <p className="text-xs text-mute mt-0.5">
                Set times, category icons & venue notes — drag rows or use arrows to reorder.
              </p>
            </div>
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-mute ring-1 ring-line shrink-0">
              {stops.length} {stops.length === 1 ? "stop" : "stops"}
            </span>
          </div>

          <ItineraryStopsManager
            stops={stops}
            planType={type}
            baseStartTime={time}
            isEditable={true}
            onAddStop={handleAddStop}
            onUpdateStop={handleUpdateStop}
            onRemoveStop={handleRemoveStop}
            onReorderStops={handleReorderStops}
          />

          {/* Nearby suggestions from live listings */}
          {nearbySuggestions.length > 0 && (
          <div className="mt-5 border-t border-line/60 pt-4">
            <p className="text-[11px] font-semibold text-mute mb-2">Nearby suggestions:</p>
            <div className="no-scrollbar flex flex-wrap gap-1.5">
              {nearbySuggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddStop({ name: p.name, time: "20:30", icon: "food", address: p.address })}
                  className="rounded-full bg-paper px-2.5 py-1 text-[11px] text-ink hover:bg-brand/10 hover:text-brand ring-1 ring-line transition"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Optional Experience Pricing Settings (When Active) */}
        {experienceData.isExperience && (
          <ExperiencePricingManager
            data={experienceData}
            onChange={(patch) => setExperienceData((prev) => ({ ...prev, ...patch }))}
            baseStartDate={date}
          />
        )}

        {/* Step 6: Who's invited */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Step 6</span>
          <label className="font-display text-lg font-semibold text-ink block mt-0.5">6. Who’s invited?</label>
          <p className="text-xs text-mute mt-0.5">Private stays invite-only · public appears on the live map & nearby feed</p>

          <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is invited">
            <button
              type="button"
              role="radio"
              aria-checked={!isPublic}
              onClick={() => {
                void triggerHaptic("light");
                setIsPublic(false);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl p-3.5 text-left transition active:scale-95 ring-1",
                !isPublic ? "bg-ink text-white ring-ink shadow-sm" : "bg-paper text-ink ring-line",
              )}
            >
              <Lock size={17} className="shrink-0" />
              <span>
                <span className="block text-sm font-semibold">Just us</span>
                <span className={cn("block text-[11px]", !isPublic ? "text-white/70" : "text-mute")}>
                  Invite-only
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isPublic}
              onClick={() => {
                void triggerHaptic("light");
                setIsPublic(true);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl p-3.5 text-left transition active:scale-95 ring-1",
                isPublic ? "bg-brand/10 ring-brand shadow-sm" : "bg-paper text-ink ring-line",
              )}
            >
              <Radar size={17} className="shrink-0 text-brand" />
              <span>
                <span className="block text-sm font-semibold">Anyone nearby</span>
                <span className="block text-[11px] text-mute">Live on the map</span>
              </span>
            </button>
          </div>

          {isPublic && (
            <div className="mt-4 border-t border-line/60 pt-4">
              <p className="text-xs font-semibold text-ink/80">Activity Tags <span className="font-normal text-mute">(helps nearby matching)</span></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACTIVITY_INTERESTS.map((tag) => {
                  const on = interests.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        void triggerHaptic("light");
                        setInterests(on ? interests.filter((i) => i !== tag.id) : [...interests, tag.id]);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ring-1",
                        on
                          ? "bg-brand text-white ring-brand shadow-xs"
                          : "bg-paper text-mute ring-line hover:text-ink",
                      )}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button (Desktop / Main) */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e)}
            className={cn(
              "w-full rounded-2xl h-14 text-base font-bold gap-2 shadow-lg transition-all cursor-pointer",
              experienceData.isExperience
                ? "bg-gradient-to-r from-amber-500 via-gold to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20"
                : "bg-gradient-to-r from-brand to-brand/90 text-white shadow-brand/20 hover:brightness-105 active:scale-[0.99]",
            )}
          >
            <Sparkles size={18} className={cn(isSubmitting && "animate-spin")} />
            <span>
              {isSubmitting
                ? "Launching Your Plan..."
                : experienceData.isExperience
                  ? "Publish Experience to Marketplace"
                  : "Create & Launch Hangout Plan"}
            </span>
          </Button>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-mute text-center">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>VIP digital invitation & co-planning itinerary will be instantly generated</span>
          </div>
        </div>
      </form>

      {/* Sticky Mobile Floating Action Bar */}
      <div className="fixed-element fixed inset-x-0 bottom-0 z-40 p-3 bg-paper/90 backdrop-blur-xl border-t border-line sm:hidden safe-bottom">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Button
            type="button"
            onClick={() => setShowLivePreviewModal(true)}
            variant="ghost"
            className="flex-1 rounded-full h-12 text-xs font-semibold gap-1.5 ring-1 ring-line bg-card"
          >
            <Eye size={15} />
            <span>Preview Card</span>
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e)}
            className={cn(
              "flex-1 rounded-full h-12 text-xs font-bold gap-1.5 shadow-md cursor-pointer",
              experienceData.isExperience
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                : "bg-brand text-white hover:brightness-105 active:scale-[0.99]",
            )}
          >
            <Sparkles size={15} className={cn(isSubmitting && "animate-spin")} />
            <span>
              {isSubmitting
                ? "Launching..."
                : experienceData.isExperience
                  ? "Publish"
                  : "Create & Launch"}
            </span>
          </Button>
        </div>
      </div>

      {/* Live VIP Invitation Card Modal Preview */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl bg-card p-5 sm:p-6 shadow-2xl ring-1 ring-line space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Live VIP Pass Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreviewModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-mute hover:text-ink hover:bg-paper transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-2">
              <InvitationCard plan={previewPlan} userStatus="going" />
            </div>

            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-2">
                <Clock size={14} className="text-brand" />
                <span>Itinerary Stops Preview ({stops.length})</span>
              </div>
              <ItineraryPreview stops={previewPlan.stops} />
            </div>

            <Button
              type="button"
              onClick={() => setShowLivePreviewModal(false)}
              className="w-full h-11 rounded-2xl text-xs font-bold"
            >
              Continue Editing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
