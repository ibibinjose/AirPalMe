import { useState } from "react";
import { DollarSign, Plus, Trash2, CheckCircle2, Calendar, Sparkles, HelpCircle, Users } from "lucide-react";
import {
  EXPERIENCE_CATEGORIES,
  type ExperienceCategory,
  type PricingModel,
  type PlanPricingTier,
  type PlanDepositConfig,
  type PlanInclusions,
  type PlanBookingPolicy,
} from "@shared/plan";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface ExperiencePricingData {
  isExperience: boolean;
  experienceCategory: ExperienceCategory;
  durationMode: "single_day" | "multi_day";
  endDate?: string;
  pricingModel: PricingModel;
  pricePerPerson: number;
  currency: string;
  capacity: number;
  depositConfig?: PlanDepositConfig;
  pricingTiers?: PlanPricingTier[];
  inclusions: PlanInclusions;
  bookingPolicy: PlanBookingPolicy;
}

interface ExperiencePricingManagerProps {
  data: ExperiencePricingData;
  onChange: (patch: Partial<ExperiencePricingData>) => void;
  baseStartDate?: string;
}

export function ExperiencePricingManager({ data, onChange, baseStartDate }: ExperiencePricingManagerProps) {
  const [newIncludedItem, setNewIncludedItem] = useState("");
  const [newNotIncludedItem, setNewNotIncludedItem] = useState("");
  const [newBringItem, setNewBringItem] = useState("");

  const handleToggleExperience = (enabled: boolean) => {
    void triggerHaptic("medium");
    onChange({
      isExperience: enabled,
      pricingModel: enabled ? (data.pricingModel === "free" ? "fixed" : data.pricingModel) : "free",
    });
  };

  const handleAddTier = () => {
    void triggerHaptic("light");
    const currentTiers = data.pricingTiers || [];
    const newTier: PlanPricingTier = {
      id: `tier-${Date.now()}`,
      name: `Tier ${currentTiers.length + 1}`,
      description: "Standard room or pass package",
      price: data.pricePerPerson || 150,
      capacity: 4,
    };
    onChange({ pricingTiers: [...currentTiers, newTier] });
  };

  const handleUpdateTier = (id: string, patch: Partial<PlanPricingTier>) => {
    const updated = (data.pricingTiers || []).map((t) => (t.id === id ? { ...t, ...patch } : t));
    onChange({ pricingTiers: updated });
  };

  const handleRemoveTier = (id: string) => {
    void triggerHaptic("light");
    const updated = (data.pricingTiers || []).filter((t) => t.id !== id);
    onChange({ pricingTiers: updated });
  };

  const handleAddInclusion = (type: "included" | "notIncluded" | "whatToBring") => {
    let val = "";
    if (type === "included") {
      val = newIncludedItem.trim();
      if (!val) return;
      onChange({
        inclusions: {
          ...data.inclusions,
          included: [...(data.inclusions.included || []), val],
        },
      });
      setNewIncludedItem("");
    } else if (type === "notIncluded") {
      val = newNotIncludedItem.trim();
      if (!val) return;
      onChange({
        inclusions: {
          ...data.inclusions,
          notIncluded: [...(data.inclusions.notIncluded || []), val],
        },
      });
      setNewNotIncludedItem("");
    } else {
      val = newBringItem.trim();
      if (!val) return;
      onChange({
        inclusions: {
          ...data.inclusions,
          whatToBring: [...(data.inclusions.whatToBring || []), val],
        },
      });
      setNewBringItem("");
    }
    void triggerHaptic("light");
  };

  const handleRemoveInclusion = (type: "included" | "notIncluded" | "whatToBring", index: number) => {
    void triggerHaptic("light");
    const currentList = data.inclusions[type] || [];
    const updated = currentList.filter((_, i) => i !== index);
    onChange({
      inclusions: {
        ...data.inclusions,
        [type]: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Experience Marketplace Mode Toggle */}
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <h3 className="text-sm font-bold text-ink">Publish as a Public Bookable Experience</h3>
            </div>
            <p className="text-xs text-mute leading-relaxed">
              Monetize your plan as an open event ticket, guided tour, weekend getaway, or wellness retreat in the
              AirPal Explore Marketplace.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={data.isExperience}
              onChange={(e) => handleToggleExperience(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-paper peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand ring-1 ring-line"></div>
          </label>
        </div>

        {data.isExperience && (
          <div className="space-y-5 pt-4 border-t border-line/60 animate-in fade-in-50">
            <div className="flex items-center gap-2.5 rounded-2xl bg-brand/5 p-3.5 text-xs text-ink ring-1 ring-brand/25">
              <Sparkles size={16} className="shrink-0 text-brand" />
              <span>
                <strong>Pay-later bookings are live:</strong> guests book spots now and pay at the door. Card payments
                and host payouts switch on with Stripe — your pricing below carries straight over.
              </span>
            </div>

            {/* 1. Category Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                1. Experience Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(EXPERIENCE_CATEGORIES).map((cat) => {
                  const isSelected = data.experienceCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        onChange({ experienceCategory: cat.id });
                      }}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-2xl ring-1 transition text-left active:scale-[0.98]",
                        isSelected
                          ? "bg-brand/10 ring-brand text-brand shadow-xs"
                          : "bg-paper text-ink ring-line hover:bg-paper/80",
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{cat.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-mute line-clamp-2 leading-tight">{cat.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Duration Mode: Single Day vs Multi-Day */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                2. Timeline & Duration
              </label>
              <div className="grid grid-cols-2 gap-2 sm:w-80">
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    onChange({ durationMode: "single_day" });
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-semibold ring-1 transition active:scale-95",
                    data.durationMode === "single_day"
                      ? "bg-brand text-white ring-brand shadow-xs"
                      : "bg-paper text-mute ring-line hover:text-ink",
                  )}
                >
                  <Calendar size={14} />
                  <span>Single-Day (Hours)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    onChange({ durationMode: "multi_day" });
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-semibold ring-1 transition active:scale-95",
                    data.durationMode === "multi_day"
                      ? "bg-brand text-white ring-brand shadow-xs"
                      : "bg-paper text-mute ring-line hover:text-ink",
                  )}
                >
                  <Calendar size={14} />
                  <span>Multi-Day (Retreat)</span>
                </button>
              </div>

              {data.durationMode === "multi_day" && (
                <div className="mt-3 p-3.5 rounded-2xl bg-paper ring-1 ring-line flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-xs text-mute">
                    <span>Departure Start: </span>
                    <strong className="text-ink">{baseStartDate || "Today"}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-mute">Ending Date:</span>
                    <input
                      type="date"
                      value={data.endDate || ""}
                      onChange={(e) => onChange({ endDate: e.target.value })}
                      className="h-9 rounded-xl bg-card px-3 text-xs font-medium text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pricing & Booking Model */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                3. Pricing & Monetization Structure
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "free", label: "Free RSVP", desc: "No charge for guests" },
                  { id: "fixed", label: "Fixed Ticket ($)", desc: "Flat price per guest" },
                  { id: "deposit", label: "Deposit Lock-in", desc: "Part upfront + balance" },
                  { id: "tiered", label: "Room / Pass Tiers", desc: "Multiple package options" },
                ].map((pm) => {
                  const isSelected = data.pricingModel === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        onChange({ pricingModel: pm.id as PricingModel });
                      }}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-2xl ring-1 transition text-left active:scale-95",
                        isSelected
                          ? "bg-brand text-white ring-brand shadow-xs"
                          : "bg-paper text-ink ring-line hover:bg-paper/80",
                      )}
                    >
                      <span className="text-xs font-bold">{pm.label}</span>
                      <span className={cn("text-[10px] mt-0.5", isSelected ? "text-white/80" : "text-mute")}>
                        {pm.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pricing Controls based on Model */}
              <div className="mt-3 p-4 rounded-2xl bg-paper ring-1 ring-line space-y-3">
                {data.pricingModel === "free" && (
                  <p className="text-xs text-mute">Guests can RSVP for free with instant attendance confirmation.</p>
                )}

                {data.pricingModel === "fixed" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-mute block mb-1">
                        Price per Guest ({data.currency || "AUD"})
                      </label>
                      <div className="flex items-center gap-1 rounded-xl bg-card px-3 h-10 ring-1 ring-line">
                        <DollarSign size={14} className="text-mute shrink-0" />
                        <input
                          type="number"
                          min="0"
                          value={data.pricePerPerson || ""}
                          onChange={(e) => onChange({ pricePerPerson: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 65"
                          className="bg-transparent text-sm font-semibold text-ink outline-none w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-mute block mb-1">Max Capacity / Spots</label>
                      <div className="flex items-center gap-1 rounded-xl bg-card px-3 h-10 ring-1 ring-line">
                        <Users size={14} className="text-mute shrink-0" />
                        <input
                          type="number"
                          min="1"
                          value={data.capacity || ""}
                          onChange={(e) => onChange({ capacity: parseInt(e.target.value, 10) || 0 })}
                          placeholder="e.g. 12"
                          className="bg-transparent text-sm font-semibold text-ink outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {data.pricingModel === "deposit" && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-semibold text-mute block mb-1">Total Experience Price</label>
                        <div className="flex items-center gap-1 rounded-xl bg-card px-3 h-10 ring-1 ring-line">
                          <DollarSign size={14} className="text-mute shrink-0" />
                          <input
                            type="number"
                            min="0"
                            value={data.pricePerPerson || ""}
                            onChange={(e) => onChange({ pricePerPerson: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 1450"
                            className="bg-transparent text-sm font-semibold text-ink outline-none w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-mute block mb-1">Deposit Upfront ($)</label>
                        <div className="flex items-center gap-1 rounded-xl bg-card px-3 h-10 ring-1 ring-line">
                          <DollarSign size={14} className="text-brand shrink-0" />
                          <input
                            type="number"
                            min="0"
                            value={data.depositConfig?.depositAmount || ""}
                            onChange={(e) =>
                              onChange({
                                depositConfig: {
                                  depositAmount: parseFloat(e.target.value) || 0,
                                  balanceDueDaysBefore: data.depositConfig?.balanceDueDaysBefore || 14,
                                },
                              })
                            }
                            placeholder="e.g. 250"
                            className="bg-transparent text-sm font-semibold text-brand outline-none w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-mute block mb-1">
                          Balance Due (Days Before)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={data.depositConfig?.balanceDueDaysBefore || 14}
                          onChange={(e) =>
                            onChange({
                              depositConfig: {
                                depositAmount: data.depositConfig?.depositAmount || 0,
                                balanceDueDaysBefore: parseInt(e.target.value, 10) || 14,
                              },
                            })
                          }
                          className="h-10 w-full rounded-xl bg-card px-3 text-xs font-medium text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {data.pricingModel === "tiered" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Package & Room Tiers</span>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-xs font-semibold ring-1 ring-brand/30 hover:bg-brand/20 transition active:scale-95"
                      >
                        <Plus size={12} />
                        <span>Add Tier</span>
                      </button>
                    </div>

                    {(data.pricingTiers || []).map((tier, idx) => (
                      <div key={tier.id || idx} className="p-3 rounded-xl bg-card ring-1 ring-line space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="absolute right-3 top-3 text-mute hover:text-red-500"
                          title="Remove Tier"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="grid gap-2 sm:grid-cols-3 pr-6">
                          <div>
                            <label className="text-[10px] text-mute block mb-0.5">Tier Name</label>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => handleUpdateTier(tier.id, { name: e.target.value })}
                              placeholder="e.g. Shared Master Suite"
                              className="h-8 w-full rounded-lg bg-paper px-2 text-xs font-semibold text-ink border border-line outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-mute block mb-0.5">Price ($)</label>
                            <input
                              type="number"
                              value={tier.price}
                              onChange={(e) => handleUpdateTier(tier.id, { price: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full rounded-lg bg-paper px-2 text-xs font-semibold text-ink border border-line outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-mute block mb-0.5">Capacity (Spots)</label>
                            <input
                              type="number"
                              value={tier.capacity}
                              onChange={(e) =>
                                handleUpdateTier(tier.id, { capacity: parseInt(e.target.value, 10) || 1 })
                              }
                              className="h-8 w-full rounded-lg bg-paper px-2 text-xs font-semibold text-ink border border-line outline-none focus:border-brand"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={tier.description || ""}
                            onChange={(e) => handleUpdateTier(tier.id, { description: e.target.value })}
                            placeholder="Description (e.g. Twin room, outdoor rain shower, pool access)"
                            className="h-7 w-full rounded-lg bg-paper px-2 text-[11px] text-mute border border-line outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Inclusions Checklist */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                4. What's Included & What to Bring
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Included */}
                <div className="p-3.5 rounded-2xl bg-paper ring-1 ring-line space-y-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    What is Included:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newIncludedItem}
                      onChange={(e) => setNewIncludedItem(e.target.value)}
                      placeholder="e.g. Daily yoga, 3 meals, surf lessons"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInclusion("included");
                        }
                      }}
                      className="h-8 flex-1 rounded-xl bg-card px-2.5 text-xs text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddInclusion("included")}
                      className="h-8 px-2.5 rounded-xl bg-brand text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(data.inclusions.included || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs text-ink bg-card px-2.5 py-1 rounded-lg ring-1 ring-line/60"
                      >
                        <span className="truncate">• {item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInclusion("included", idx)}
                          className="text-mute hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What to Bring */}
                <div className="p-3.5 rounded-2xl bg-paper ring-1 ring-line space-y-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-amber-500" />
                    What Guests Should Bring:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newBringItem}
                      onChange={(e) => setNewBringItem(e.target.value)}
                      placeholder="e.g. Swimwear, yoga mat, passport"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInclusion("whatToBring");
                        }
                      }}
                      className="h-8 flex-1 rounded-xl bg-card px-2.5 text-xs text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddInclusion("whatToBring")}
                      className="h-8 px-2.5 rounded-xl bg-brand text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(data.inclusions.whatToBring || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs text-ink bg-card px-2.5 py-1 rounded-lg ring-1 ring-line/60"
                      >
                        <span className="truncate">• {item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInclusion("whatToBring", idx)}
                          className="text-mute hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
