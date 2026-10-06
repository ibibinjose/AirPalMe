import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit3,
  Waves,
  Dumbbell,
  Wine,
  Luggage,
  Shirt,
  Wifi,
  Utensils,
  Sparkles,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FacilityItem, PropertyInfo } from "@shared/airpal-data";
import { savePropertyProfile } from "@/lib/properties";
import { triggerHaptic } from "@/lib/native";

const FACILITY_PRESETS = [
  {
    name: "Rooftop Plunge Pool",
    hours: "6:00 AM – 10:00 PM",
    floor: "Level 7",
    details: "Heated water, panoramic city views & sun loungers",
    icon: "Waves",
  },
  {
    name: "24/7 Fitness Centre & Sauna",
    hours: "24 Hours (Keycard Access)",
    floor: "Level 2",
    details: "Technogym equipment, free weights & eucalyptus sauna",
    icon: "Dumbbell",
  },
  {
    name: "The Rocks Cellar Lounge & Bar",
    hours: "4:00 PM – 11:30 PM",
    floor: "Ground Floor",
    details: "Curated Australian wines, artisan spirits & craft cocktails",
    icon: "Wine",
  },
  {
    name: "Luggage Storage",
    hours: "24/7 Front Desk",
    floor: "Lobby",
    details: "Complimentary secure luggage holding pre-checkin & post-checkout",
    icon: "Luggage",
  },
  {
    name: "Guest Laundry & Steamer",
    hours: "7:00 AM – 9:00 PM",
    floor: "Level 3",
    details: "Self-service Miele washers & dryers, dry cleaning on request",
    icon: "Shirt",
  },
  {
    name: "High-Speed Fibre Wi-Fi",
    hours: "24/7 Unlimited",
    floor: "Throughout Property",
    details: "High-speed fibre throughout all rooms and public areas",
    icon: "Wifi",
  },
] as const;

const field =
  "mt-1 h-11 w-full rounded-2xl ring-1 ring-line bg-paper/70 px-4 text-xs sm:text-sm outline-none transition focus:bg-card focus:ring-2 focus:ring-brand/40";

function FacilityIconView({ icon, name }: { icon?: string; name: string }) {
  const norm = `${icon || ""} ${name}`.toLowerCase();
  if (norm.includes("pool") || norm.includes("waves")) return <Waves size={16} className="text-sky-500" />;
  if (norm.includes("gym") || norm.includes("dumbbell") || norm.includes("fitness"))
    return <Dumbbell size={16} className="text-amber-500" />;
  if (norm.includes("bar") || norm.includes("wine")) return <Wine size={16} className="text-rose-500" />;
  if (norm.includes("luggage")) return <Luggage size={16} className="text-emerald-500" />;
  if (norm.includes("laundry") || norm.includes("shirt")) return <Shirt size={16} className="text-indigo-500" />;
  if (norm.includes("wifi")) return <Wifi size={16} className="text-cyan-500" />;
  if (norm.includes("spa") || norm.includes("wellness")) return <Sparkles size={16} className="text-fuchsia-500" />;
  if (norm.includes("dining") || norm.includes("eat")) return <Utensils size={16} className="text-orange-500" />;
  return <Building2 size={16} className="text-accent" />;
}

export function HostFacilitiesPanel({
  property,
  onSaved,
}: {
  property: PropertyInfo;
  onSaved: (updated: PropertyInfo) => void;
}) {
  const [facilities, setFacilities] = useState<FacilityItem[]>(property.facilities || []);
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [floor, setFloor] = useState("");
  const [details, setDetails] = useState("");
  const [icon, setIcon] = useState("Building2");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(nextList: FacilityItem[]) {
    setBusy(true);
    try {
      const updated = await savePropertyProfile(property.id, {
        facilities: nextList,
        confirmHours: true,
      });
      setFacilities(nextList);
      onSaved(updated);
      toast.success("Facilities updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update facilities");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a facility name");
      return;
    }

    const newItem: FacilityItem = {
      id: `fac-${Date.now()}`,
      name: name.trim(),
      hours: hours.trim() || "24/7",
      floor: floor.trim() || "Lobby",
      details: details.trim(),
      icon,
    };

    let nextList: FacilityItem[];
    if (editingIndex !== null) {
      nextList = [...facilities];
      nextList[editingIndex] = newItem;
      setEditingIndex(null);
    } else {
      nextList = [...facilities, newItem];
    }

    await persist(nextList);
    setName("");
    setHours("");
    setFloor("");
    setDetails("");
    setIcon("Building2");
  }

  function handleEdit(index: number) {
    const item = facilities[index];
    if (!item) return;
    setName(item.name);
    setHours(item.hours);
    setFloor(item.floor);
    setDetails(item.details || item.description || "");
    setIcon(item.icon || "Building2");
    setEditingIndex(index);
    window.scrollTo({ top: document.getElementById("facility-form")?.offsetTop || 0, behavior: "smooth" });
  }

  async function handleDelete(index: number) {
    void triggerHaptic("medium");
    const nextList = facilities.filter((_, i) => i !== index);
    await persist(nextList);
  }

  async function handleApplyPreset(preset: (typeof FACILITY_PRESETS)[number]) {
    void triggerHaptic("light");
    if (facilities.some((f) => f.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.info(`${preset.name} is already added`);
      return;
    }
    const nextList: FacilityItem[] = [
      ...facilities,
      {
        id: `fac-${Date.now()}`,
        name: preset.name,
        hours: preset.hours,
        floor: preset.floor,
        details: preset.details,
        icon: preset.icon,
      },
    ];
    await persist(nextList);
  }

  return (
    <div className="mt-5 space-y-6">
      {/* Current Facilities List */}
      <section className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Hotel Amenities</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">Property Facilities</h2>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            {facilities.length} Active
          </span>
        </div>

        <p className="mt-1 text-xs sm:text-sm text-mute leading-relaxed">
          Manage amenities and services available to guests. Displayed on your public profile and digital compendium.
        </p>

        {facilities.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-paper/60 p-6 text-center ring-1 ring-line">
            <Building2 size={24} className="mx-auto text-mute opacity-60 mb-2" />
            <p className="font-semibold text-sm text-ink">No facilities added yet</p>
            <p className="text-xs text-mute mt-0.5">Choose a quick preset below or create your own custom amenity.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {facilities.map((fac, idx) => (
              <div
                key={fac.id || idx}
                className="flex items-start justify-between gap-3 rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs transition hover:bg-paper"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line/70">
                    <FacilityIconView icon={fac.icon} name={fac.name} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs sm:text-sm text-ink truncate">{fac.name}</p>
                      {fac.floor && (
                        <span className="text-[10px] font-semibold bg-brand/10 text-accent px-2 py-0.2 rounded-full shrink-0">
                          {fac.floor}
                        </span>
                      )}
                    </div>
                    {fac.hours && <p className="text-[11px] text-mute font-medium mt-0.5">{fac.hours}</p>}
                    {(fac.details || fac.description) && (
                      <p className="text-xs text-ink/75 mt-1 leading-relaxed">{fac.details || fac.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(idx)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:text-ink hover:bg-black/5 active:scale-95 transition"
                    title="Edit facility"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 active:scale-95 transition"
                    title="Remove facility"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1-Tap Quick Presets */}
        <div className="mt-5 pt-5 border-t border-line/70">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute mb-2">
            1-Tap Quick Amenity Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {FACILITY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper/80 hover:ring-brand/30 transition active:scale-95"
              >
                <Plus size={12} className="text-accent" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Add / Edit Form */}
      <form
        id="facility-form"
        onSubmit={handleAdd}
        className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm sm:p-6 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            {editingIndex !== null ? "Edit Facility" : "Add New Facility"}
          </h3>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={() => {
                setEditingIndex(null);
                setName("");
                setHours("");
                setFloor("");
                setDetails("");
              }}
              className="text-xs text-mute hover:text-ink font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-ink/75">Facility Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rooftop Plunge Pool, 24/7 Gym, Sauna"
            className={field}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-ink/75">Operating Hours</span>
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 6:00 AM – 10:00 PM, 24 Hours"
              className={field}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/75">Floor / Location</span>
            <input
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. Level 7, Level 2, Lobby, Ground Floor"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-ink/75">Details & Description</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Heated water, panoramic views, keycard access required…"
            rows={2}
            className="mt-1 w-full rounded-2xl ring-1 ring-line bg-paper/70 p-3.5 text-xs sm:text-sm outline-none transition focus:bg-card focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>

        <Button type="submit" disabled={busy} loading={busy} className="w-full h-11 text-xs font-bold cursor-pointer">
          {editingIndex !== null ? "Save Changes" : "Add Facility to Property"}
        </Button>
      </form>
    </div>
  );
}
