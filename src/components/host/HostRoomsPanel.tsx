import { useEffect, useState } from "react";
import { BedDouble, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { savePropertyProfile } from "@/lib/properties";
import {
  addRoomsToType,
  buildRoomType,
  normalizeRoomStatus,
  pruneRoomStatuses,
  removeRoomFromType,
  ROOM_STATUSES,
  roomCategories,
  setRoomStatus,
  suggestRoomNumbers,
  validateRoomTypeDraft,
  type RoomTypeDraft,
} from "@/lib/host-rooms";
import type { PropertyInfo } from "@shared/airpal-data";
import type { RoomType } from "@shared/airpal-data";
import { cn } from "@/lib/cn";

const emptyDraft: RoomTypeDraft = {
  name: "",
  category: "Standard",
  capacity: 2,
  bedConfig: "",
  startingPrice: undefined,
  features: [],
  startNumber: "101",
  count: 5,
};

export function HostRoomsPanel({
  property,
  onSaved,
}: {
  property: PropertyInfo;
  onSaved: (next: PropertyInfo) => void;
}) {
  const [types, setTypes] = useState<RoomType[]>(() => property.roomTypes || []);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<RoomTypeDraft>(emptyDraft);
  const [featureText, setFeatureText] = useState("");
  const [addCounts, setAddCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusRoom, setStatusRoom] = useState<string | null>(null);

  useEffect(() => {
    setTypes(property.roomTypes || []);
  }, [property.id, property.roomTypes]);

  const locked = !property.id || property.id === "unknown";

  async function persist(
    next: RoomType[],
    okMsg: string,
    statuses?: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">,
  ) {
    if (locked) {
      toast.error("Save the place details first");
      return;
    }
    setSaving(true);
    try {
      const liveNumbers = next.flatMap((t) => t.roomNumbers || []);
      const patch: {
        roomTypes: RoomType[];
        roomStatuses?: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">;
      } = {
        roomTypes: next,
      };
      if (statuses) patch.roomStatuses = pruneRoomStatuses(statuses, liveNumbers);
      const saved = await savePropertyProfile(property.id, patch);
      setTypes(saved.roomTypes || next);
      onSaved(saved);
      toast.success(okMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save rooms");
    } finally {
      setSaving(false);
    }
  }

  function onCreate() {
    const full: RoomTypeDraft = {
      ...draft,
      features: featureText
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    const problem = validateRoomTypeDraft(full, types);
    if (problem) {
      toast.error(problem);
      return;
    }
    const built = buildRoomType(full, types);
    void persist([...types, built], `${built.name} added with ${built.totalRooms} rooms`);
    setDraft(emptyDraft);
    setFeatureText("");
    setShowForm(false);
  }

  const previewNumbers = suggestRoomNumbers(
    types.flatMap((t) => t.roomNumbers || []),
    draft.startNumber || "101",
    draft.count || 1,
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-mute">
          {types.length === 0
            ? "No room types yet."
            : `${types.reduce((n, t) => n + (t.roomNumbers?.length || t.totalRooms || 0), 0)} rooms across ${types.length} type${types.length === 1 ? "" : "s"}`}
        </p>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "+ New room type"}
        </Button>
      </div>

      {showForm && (
        <section className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">New room type</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ValidField label="Type name" ok={draft.name.trim().length >= 2}>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Deluxe King Harbour View"
                className={fieldInput}
              />
            </ValidField>
            <label className="block">
              <span className="text-[12px] text-mute">Category</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as RoomType["category"] })}
                className={`${fieldInput} mt-1`}
              >
                {roomCategories().map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <ValidField label="Sleeps" ok={draft.capacity >= 1}>
              <input
                type="number"
                min={1}
                max={12}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
                className={fieldInput}
              />
            </ValidField>
            <ValidField label="Bed setup" ok={draft.bedConfig.trim().length >= 2}>
              <input
                value={draft.bedConfig}
                onChange={(e) => setDraft({ ...draft, bedConfig: e.target.value })}
                placeholder="e.g. 1 King Bed"
                className={fieldInput}
              />
            </ValidField>
            <label className="block">
              <span className="text-[12px] text-mute">From $ / night</span>
              <input
                type="number"
                min={0}
                value={draft.startingPrice ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, startingPrice: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="e.g. 320"
                className={`${fieldInput} mt-1`}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-mute">Size (m², optional)</span>
              <input
                type="number"
                min={0}
                value={draft.sizeSqm ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, sizeSqm: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="e.g. 38"
                className={`${fieldInput} mt-1`}
              />
            </label>
            <ValidField label="First room number" ok={draft.startNumber.trim().length >= 1}>
              <input
                value={draft.startNumber}
                onChange={(e) => setDraft({ ...draft, startNumber: e.target.value })}
                placeholder="101"
                className={fieldInput}
              />
            </ValidField>
            <ValidField label="How many rooms" ok={(draft.count || 0) >= 1}>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.count}
                onChange={(e) => setDraft({ ...draft, count: Number(e.target.value) })}
                className={fieldInput}
              />
            </ValidField>
          </div>
          <label className="mt-3 block">
            <span className="text-[12px] text-mute">Highlights (comma separated)</span>
            <input
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              placeholder="Harbour view, Rain shower, Espresso machine"
              className={`${fieldInput} mt-1`}
            />
          </label>
          <p className="mt-2 text-xs text-mute">Rooms: {previewNumbers.join(", ")}</p>
          <Button className="mt-3 w-full" onClick={onCreate} disabled={saving} loading={saving}>
            Add room type
          </Button>
        </section>
      )}

      {types.length === 0 && !showForm ? (
        <div className="rounded-[28px] bg-card/90 p-8 text-center ring-1 ring-line">
          <BedDouble size={22} className="mx-auto text-gold" />
          <p className="mt-2 font-medium">List your first rooms</p>
          <p className="mt-1 text-sm text-mute">
            Room types power the guest stay page, occupancy counts, and per-room QR codes.
          </p>
        </div>
      ) : null}

      {types.map((t) => {
        const numbers = t.roomNumbers || [];
        const addCount = addCounts[t.id] ?? 1;
        const editing = editingId === t.id;
        return (
          <section key={t.id} className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {t.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mute">
                  Sleeps {t.capacity} · {t.bedConfig}
                  {typeof t.startingPrice === "number" ? ` · from $${t.startingPrice}` : ""}
                  {t.sizeSqm ? ` · ${t.sizeSqm} m²` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
                {numbers.length || t.totalRooms || 0} rooms
              </span>
            </div>

            {numbers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {numbers.map((n) => {
                  const status = normalizeRoomStatus(property.roomStatuses?.[n]);
                  const selected = statusRoom === `${t.id}:${n}`;
                  return (
                    <span
                      key={n}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full bg-paper py-1 pl-2.5 pr-1.5 text-xs ring-1 transition",
                        selected ? "ring-2 ring-brand" : "ring-line",
                      )}
                    >
                      <button
                        type="button"
                        title={`Mark room ${n} — now ${status}. Tap to change.`}
                        onClick={() => setStatusRoom(selected ? null : `${t.id}:${n}`)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-2 w-2 rounded-full",
                            status === "occupied" && "bg-brand",
                            status === "vacant" && "bg-emerald-500",
                            status === "cleaning" && "bg-amber-500",
                            status === "maintenance" && "bg-red-500",
                          )}
                        />
                        {n}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove room ${n}`}
                        disabled={saving}
                        onClick={() => {
                          const next = removeRoomFromType(types, t.id, n);
                          void persist(next, `Room ${n} removed`, property.roomStatuses);
                          if (selected) setStatusRoom(null);
                        }}
                        className="text-mute opacity-60 transition hover:text-red-600 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {numbers.some((n) => statusRoom === `${t.id}:${n}`) && (
              <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl bg-paper p-2 ring-1 ring-line">
                {ROOM_STATUSES.map((s) => {
                  const activeN = numbers.find((n) => statusRoom === `${t.id}:${n}`)!;
                  const active = normalizeRoomStatus(property.roomStatuses?.[activeN]) === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        void persist(
                          types,
                          `Room ${activeN} marked ${s}`,
                          setRoomStatus(property.roomStatuses, activeN, s),
                        );
                        setStatusRoom(null);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                        active ? "bg-brand text-white" : "ring-1 ring-line hover:ring-brand/40",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full ring-1 ring-line">
                <button
                  type="button"
                  aria-label="Fewer rooms to add"
                  className="px-2.5 py-2 text-mute hover:text-ink"
                  onClick={() => setAddCounts({ ...addCounts, [t.id]: Math.max(1, addCount - 1) })}
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold">{addCount}</span>
                <button
                  type="button"
                  aria-label="More rooms to add"
                  className="px-2.5 py-2 text-mute hover:text-ink"
                  onClick={() => setAddCounts({ ...addCounts, [t.id]: Math.min(50, addCount + 1) })}
                >
                  <Plus size={14} />
                </button>
              </div>
              <Button
                className="h-9 px-4 text-xs"
                disabled={saving}
                onClick={() => {
                  const next = addRoomsToType(types, t.id, addCount);
                  void persist(
                    next,
                    addCount === 1 ? `1 more room added to ${t.name}` : `${addCount} more rooms added to ${t.name}`,
                  );
                  setAddCounts({ ...addCounts, [t.id]: 1 });
                }}
              >
                Add {addCount === 1 ? "room" : `${addCount} rooms`}
              </Button>
              <button
                type="button"
                className="ml-auto text-xs font-medium text-mute hover:text-ink"
                onClick={() => {
                  setEditingId(editing ? null : t.id);
                  setEditPrice(typeof t.startingPrice === "number" ? String(t.startingPrice) : "");
                  setConfirmDeleteId(null);
                }}
              >
                {editing ? "Done" : "Edit price"}
              </button>
              <button
                type="button"
                className={cn(
                  "text-xs font-medium",
                  confirmDeleteId === t.id ? "text-red-600" : "text-mute hover:text-red-600",
                )}
                onClick={() => {
                  if (confirmDeleteId !== t.id) {
                    setConfirmDeleteId(t.id);
                    return;
                  }
                  void persist(
                    types.filter((x) => x.id !== t.id),
                    `${t.name} removed`,
                    property.roomStatuses,
                  );
                  setConfirmDeleteId(null);
                }}
              >
                {confirmDeleteId === t.id ? "Tap to confirm" : "Remove"}
              </button>
            </div>

            {editing && (
              <div className="mt-3 flex items-end gap-2">
                <label className="flex-1">
                  <span className="text-[12px] text-mute">From $ / night</span>
                  <input
                    type="number"
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={`${fieldInput} mt-1`}
                  />
                </label>
                <Button
                  className="h-10 px-4 text-xs"
                  disabled={saving}
                  onClick={() => {
                    const price = editPrice === "" ? undefined : Number(editPrice);
                    if (price !== undefined && !(price > 0)) {
                      toast.error("Nightly price must be above $0");
                      return;
                    }
                    void persist(
                      types.map((x) => (x.id === t.id ? { ...x, startingPrice: price } : x)),
                      "Price updated",
                    );
                    setEditingId(null);
                  }}
                >
                  Save
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
