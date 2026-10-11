import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, Check, Clock, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  PLAN_THEMES,
  PLAN_TYPES,
  canCancelPlanStatus,
  isPlanManager,
  type PlanTheme,
  type PlanType,
} from "@shared/plan";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_TYPE_ICONS } from "@/components/plan/planTypeIcons";
import { ItineraryStopsManager } from "@/components/plan/ItineraryStopsManager";
import { ImageField } from "@/components/media/ImageField";
import { NotFoundPage } from "./NotFoundPage";
import { PageLoading } from "@/components/ui/PageLoading";
import { AuthGate } from "@/components/auth/AuthGate";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import type { Geo } from "@shared/nearby";

export function PlanEditPage() {
  const [, params] = useRoute("/plan/:id/edit");
  const [, nav] = useLocation();
  const planId = params?.id || "";

  const { getPlan, updatePlan, deletePlan, cancelPlan, addStop, updateStop, removeStop, reorderStops } = usePlans();
  const { user, authReady } = useAuth();

  const plan = getPlan(planId);

  const [title, setTitle] = useState(plan?.title || "");
  const [type, setType] = useState<PlanType>(plan?.type || "nightout");
  const [theme, setTheme] = useState<PlanTheme>(plan?.theme || "gold");
  const [date, setDate] = useState(plan?.date || "");
  const [time, setTime] = useState(plan?.time || "18:30");
  const [endTime, setEndTime] = useState(plan?.endTime || "");
  const [destination, setDestination] = useState(plan?.destination || "");
  const [placeGeo, setPlaceGeo] = useState<Geo | undefined>(plan?.geo);
  const [notes, setNotes] = useState(plan?.notes || "");
  const [heroImage, setHeroImage] = useState<string | undefined>(plan?.heroImage);
  const [isPublic, setIsPublic] = useState(plan?.isPublic ?? true);
  const [interests, setInterests] = useState<string[]>(plan?.interests || []);

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setType(plan.type);
      setTheme(plan.theme);
      setDate(plan.date);
      setTime(plan.time);
      setEndTime(plan.endTime || "");
      setDestination(plan.destination);
      setPlaceGeo(plan.geo);
      setNotes(plan.notes || "");
      setHeroImage(plan.heroImage);
      setIsPublic(plan.isPublic ?? true);
      setInterests(plan.interests || []);
    }
  }, [plan]);

  if (!authReady) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <AuthGate
        next={`/plan/${planId}/edit`}
        kicker="AirPal Studio"
        title="Edit your Hangout Plan"
        lede="Sign in to your AirPal.me account to edit your hangout plan details and manage itinerary stops."
      />
    );
  }

  if (!plan) {
    return <NotFoundPage />;
  }

  const isHost = !plan.creator.uid || isPlanManager(plan, user?.uid);

  if (!isHost) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Access Restricted</h2>
        <p className="text-xs text-mute mt-2">Only the host of this plan can edit its main details.</p>
        <Button onClick={() => nav(`/plan/${plan.id}`)} className="mt-4 rounded-full">
          Back to Plan
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void triggerHaptic("success");
    updatePlan(plan.id, {
      title: title.trim(),
      type,
      theme,
      date,
      time,
      endTime: endTime.trim() || undefined,
      destination: destination.trim(),
      geo: placeGeo,
      notes: notes.trim() || undefined,
      heroImage,
      isPublic,
      interests,
    });
    nav(`/plan/${plan.id}`);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      deletePlan(plan.id);
      nav("/plan");
    }
  };

  const [cancelReason, setCancelReason] = useState("");
  const handleCancelPlan = () => {
    if (!window.confirm("Cancel this plan? Everyone going will be notified.")) return;
    const updated = cancelPlan(plan.id, cancelReason);
    if (updated) nav(`/plan/${plan.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nav(`/plan/${plan.id}`)}
            className="grid h-10 w-10 place-items-center rounded-full bg-card ring-1 ring-line text-ink hover:bg-paper transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Host Settings</span>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">Edit Plan Details</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="grid h-10 w-10 place-items-center rounded-full text-mute hover:bg-card hover:text-red-500 transition ring-1 ring-line"
          title="Delete plan"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Occasion format */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">01 · Occasion</p>
          <label className="font-display text-base font-semibold text-ink block">Occasion Format</label>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent mb-2 block">
              Life Milestones & Celebrations
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PLAN_TYPES) as PlanType[])
                .filter((k) => PLAN_TYPES[k].category === "Life Milestone")
                .map((tKey) => {
                  const item = PLAN_TYPES[tKey];
                  const Icon = PLAN_TYPE_ICONS[tKey];
                  const isSelected = type === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setType(tKey)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition active:scale-95 ring-1",
                        isSelected
                          ? "bg-brand/10 text-ink ring-brand font-semibold shadow-xs"
                          : "bg-paper text-mute ring-line hover:text-ink",
                      )}
                    >
                      <Icon size={16} />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="border-t border-line/60 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70 mb-2 block">
              Social Outings & Gatherings
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PLAN_TYPES) as PlanType[])
                .filter((k) => PLAN_TYPES[k].category !== "Life Milestone")
                .map((tKey) => {
                  const item = PLAN_TYPES[tKey];
                  const Icon = PLAN_TYPE_ICONS[tKey];
                  const isSelected = type === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setType(tKey)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition active:scale-95 ring-1",
                        isSelected
                          ? "bg-brand/10 text-ink ring-brand font-semibold shadow-xs"
                          : "bg-paper text-mute ring-line hover:text-ink",
                      )}
                    >
                      <Icon size={16} />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Details & Destination */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">02 · Details</p>
          <label className="font-display text-base font-semibold text-ink block">Basic Information</label>

          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Plan Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-2xl bg-paper px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand font-medium text-ink focus:border-brand"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink/80 block mb-1">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
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
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink/80 block mb-1">End Time</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
                />
              </div>
            </div>
          </div>

          <PlaceAddressField
            label="Destination / Venue"
            required
            value={destination}
            onChange={setDestination}
            onPick={(picked: PickedPlace) => {
              setDestination(picked.label);
              setPlaceGeo(picked.geo);
            }}
            placeholder="Search Google Maps"
          />

          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Host Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl bg-paper p-3.5 text-xs md:text-sm border border-line outline-none focus:ring-2 focus:ring-brand text-ink leading-relaxed focus:border-brand"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">03 · Photo</p>
          <ImageField
            kind="square"
            folder="listings"
            label="Photo"
            value={heroImage}
            onChange={(url) => setHeroImage(url)}
          />
        </div>

        {/* VIP Theme */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">04 · Theme</p>
          <label className="font-display text-base font-semibold text-ink block mt-1">Invitation Card Theme</label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(PLAN_THEMES) as PlanTheme[]).map((tKey) => {
              const th = PLAN_THEMES[tKey];
              const isSelected = theme === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setTheme(tKey)}
                  className={cn(
                    "relative rounded-2xl p-3.5 text-center transition ring-2",
                    isSelected ? "ring-brand shadow-md" : "ring-black/5",
                  )}
                  style={{ background: th.accentColor }}
                >
                  {isSelected && (
                    <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-white text-ink">
                      <Check size={10} />
                    </span>
                  )}
                  <span className="text-xs font-bold text-white drop-shadow-sm">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Itinerary Stops Section */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">05 · Stops</p>
          <div className="flex items-center justify-between gap-3 mb-4 mt-1">
            <div>
              <label className="font-display text-base font-semibold text-ink block">Itinerary Stops & Schedule</label>
              <p className="text-xs text-mute mt-0.5">Add, edit, or reorder the stops and venues for this gathering</p>
            </div>
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-mute ring-1 ring-line shrink-0">
              {plan.stops.length} {plan.stops.length === 1 ? "stop" : "stops"}
            </span>
          </div>

          <ItineraryStopsManager
            stops={plan.stops}
            planType={type}
            baseStartTime={time}
            isEditable={true}
            onAddStop={(stopData) => {
              addStop(plan.id, {
                name: stopData.name,
                time: stopData.time,
                icon: stopData.icon,
                address: stopData.address,
                notes: stopData.notes,
                addedByName: user?.displayName || "Host",
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
          />
        </div>

        {/* Submit — sticky so save is always in reach on the long form */}
        <div className="sticky bottom-24 z-10 flex gap-3 rounded-2xl bg-card/95 p-2 ring-1 ring-line shadow-md backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav(`/plan/${plan.id}`)}
            className="flex-1 h-12 rounded-2xl ring-1 ring-line"
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1 h-12 rounded-2xl font-semibold shadow-md gap-2">
            <Save size={16} />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>

      {/* Danger zone: cancel notifies the going crew; delete erases silently */}
      {canCancelPlanStatus(plan.status) && (
        <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-red-500/20 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-500">Danger zone</p>
          <h2 className="font-display text-base font-bold text-ink">Cancel this plan</h2>
          <p className="mt-0.5 text-[13px] text-mute">
            Everyone going gets notified. The plan stays visible as cancelled.
          </p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for the crew (optional)"
            aria-label="Cancellation reason"
            className="mt-3 h-11 w-full rounded-2xl bg-paper px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <button
            type="button"
            onClick={handleCancelPlan}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-xs hover:bg-red-600 transition active:scale-95"
          >
            Cancel plan
          </button>
        </div>
      )}
    </div>
  );
}
