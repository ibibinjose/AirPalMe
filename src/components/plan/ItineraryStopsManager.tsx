import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  formatTime12h,
  type PlanType,
  type StopIconType,
} from "@shared/plan";
import {
  STOP_ICON_OPTIONS,
  STOP_ICON_CATEGORIES,
  getStopIconDef,
} from "./stopIcons";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface ItineraryStopData {
  id?: string;
  name: string;
  time?: string;
  notes?: string;
  icon?: StopIconType | string;
  address?: string;
  placeId?: string;
  votes?: number;
  voterUids?: string[];
  addedByName?: string;
  addedByUid?: string;
}

export interface OccasionStopTemplate {
  name: string;
  icon: StopIconType;
  offsetMinutes: number;
  notes: string;
}

export const OCCASION_STOP_TEMPLATES: Record<PlanType, OccasionStopTemplate[]> = {
  birthday: [
    { name: "Welcome Cocktails & Arrival", icon: "drinks", offsetMinutes: 0, notes: "Welcome cocktails, arrivals and greeting the crew" },
    { name: "Celebration Dinner & Table Toast", icon: "food", offsetMinutes: 60, notes: "Dinner table reservation with share plates" },
    { name: "Birthday Speeches & Cheers", icon: "speech", offsetMinutes: 135, notes: "Speeches, funny memories & toast to the birthday mate" },
    { name: "Birthday Cake & Candles", icon: "cake", offsetMinutes: 165, notes: "Singing, candles blown & cake cutting" },
    { name: "Dance Floor & Late Night Tunes", icon: "music", offsetMinutes: 210, notes: "Party vibes and late night celebrations" },
  ],
  wedding: [
    { name: "Ceremony & Exchange of Vows", icon: "ceremony", offsetMinutes: 0, notes: "Processional, official vows and rings exchange" },
    { name: "Cocktail Hour & Photo Session", icon: "photo", offsetMinutes: 60, notes: "Champagne, canapés and family portraits" },
    { name: "Reception Dinner & Speeches", icon: "speech", offsetMinutes: 120, notes: "Banquet dining, bridal party speeches & wine" },
    { name: "Wedding Cake Cutting", icon: "cake", offsetMinutes: 210, notes: "Cutting the wedding cake & dessert table" },
    { name: "First Dance & Celebration", icon: "music", offsetMinutes: 240, notes: "First dance and open celebration dance floor" },
    { name: "Sparkler Send-Off & Farewell", icon: "toast", offsetMinutes: 330, notes: "Sparkler farewell toast" },
  ],
  graduation: [
    { name: "Commencement Ceremony & Stage Walk", icon: "ceremony", offsetMinutes: 0, notes: "Academic procession, caps & degree conferral" },
    { name: "Campus Portraits & Cap Toss", icon: "photo", offsetMinutes: 90, notes: "Family photos and the iconic cap tossing moment" },
    { name: "Graduation Toast & Canapés", icon: "toast", offsetMinutes: 150, notes: "Champagne toast to the graduate's achievement" },
    { name: "Celebration Family Dinner", icon: "food", offsetMinutes: 210, notes: "Fine dining celebratory family dinner" },
  ],
  housewarming: [
    { name: "House Tour & Welcome Drinks", icon: "home", offsetMinutes: 0, notes: "Guided home tour and welcome refreshments" },
    { name: "Backyard BBQ & Grazing Table", icon: "food", offsetMinutes: 60, notes: "BBQ sizzle, grazing table and salads" },
    { name: "Sunset Toast to New Memories", icon: "toast", offsetMinutes: 150, notes: "Housewarming cheers to the new home" },
    { name: "Firepit & Outdoor Hangout", icon: "drinks", offsetMinutes: 210, notes: "Drinks and stories around the firepit" },
  ],
  baby_shower: [
    { name: "Welcome Refreshments & Grazing Table", icon: "coffee", offsetMinutes: 0, notes: "Mocktails, punch, tea and grazing table" },
    { name: "Baby Shower Games & Trivia", icon: "gift", offsetMinutes: 60, notes: "Fun baby predictions, trivia and shower games" },
    { name: "Gift Opening & Family Blessings", icon: "gift", offsetMinutes: 120, notes: "Opening presents with friends and family" },
    { name: "Celebration Cake & Afternoon Toast", icon: "cake", offsetMinutes: 165, notes: "Cake cutting and cheers for baby" },
  ],
  memorial: [
    { name: "Memorial Service & Tributes", icon: "ceremony", offsetMinutes: 0, notes: "Memorial gathering, readings and honouring loved one" },
    { name: "Eulogies & Sharing Stories", icon: "speech", offsetMinutes: 45, notes: "Heartfelt stories and remembrance tributes" },
    { name: "Remembrance Wake & Tea Reception", icon: "toast", offsetMinutes: 90, notes: "Refreshments, photo memories and fellowship" },
  ],
  anniversary: [
    { name: "Champagne Arrival & Toast", icon: "toast", offsetMinutes: 0, notes: "Champagne flutes and milestone celebration cheers" },
    { name: "Multi-Course Gourmet Dinner", icon: "food", offsetMinutes: 45, notes: "Special anniversary dinner table" },
    { name: "Anniversary Speeches & Dessert", icon: "speech", offsetMinutes: 120, notes: "Dessert, toasts, memories and gratitude" },
  ],
  nightout: [
    { name: "Sunset Rooftop Cocktails", icon: "drinks", offsetMinutes: 0, notes: "Golden hour drinks with harbour/city views" },
    { name: "Dinner & Share Plates", icon: "food", offsetMinutes: 75, notes: "Main dinner table booking" },
    { name: "Craft Cocktail Bar & Banter", icon: "drinks", offsetMinutes: 150, notes: "Cocktail lounge and high energy vibes" },
    { name: "Live DJ & Dance Floor", icon: "music", offsetMinutes: 225, notes: "Late night dancing and tunes" },
  ],
  lunch: [
    { name: "Laneway Coffee & Meetup", icon: "coffee", offsetMinutes: 0, notes: "Artisan espresso and meeting the mates" },
    { name: "Sunny Patio Lunch & Wine", icon: "food", offsetMinutes: 45, notes: "Al fresco dining and shared dishes" },
    { name: "Waterfront Stroll & Gelato", icon: "walk", offsetMinutes: 120, notes: "Scenic promenade stroll with artisanal gelato" },
  ],
  movies: [
    { name: "Pre-Movie Drinks & Snacks", icon: "drinks", offsetMinutes: 0, notes: "Gathering before the film starts" },
    { name: "Cinema Premiere & Popcorn", icon: "sight", offsetMinutes: 45, notes: "Main movie screening in theatre" },
    { name: "Post-Movie Debrief & Dessert", icon: "food", offsetMinutes: 165, notes: "Discussing film highlights over dessert" },
  ],
  trip: [
    { name: "Morning Fuel & Flat Whites", icon: "petrol", offsetMinutes: 0, notes: "Fill up petrol tank and grab morning coffee" },
    { name: "Scenic Mountain / Coast Lookout", icon: "sight", offsetMinutes: 90, notes: "Panoramic vista and group photo stop" },
    { name: "Country Bakery / Seaside Lunch", icon: "food", offsetMinutes: 180, notes: "Famous local bakery pies & fresh lunch" },
    { name: "Arrival & Sunset Campfire", icon: "stay", offsetMinutes: 300, notes: "Check-in, sunset views and campfire dinner" },
  ],
  escape: [
    { name: "Scenic Roadtrip Departure", icon: "petrol", offsetMinutes: 0, notes: "Hit the road with roadtrip playlist" },
    { name: "Cabin / Beach Retreat Check-in", icon: "stay", offsetMinutes: 120, notes: "Unpack and explore the stay" },
    { name: "Seaside Dinner & Wine", icon: "food", offsetMinutes: 240, notes: "Fresh local produce and sunset drinks" },
  ],
  gig: [
    { name: "Pre-Show Drinks & Merch", icon: "drinks", offsetMinutes: 0, notes: "Meetup before doors open & grab tour merch" },
    { name: "Live Stage & Headliner Set", icon: "music", offsetMinutes: 75, notes: "Live concert performance" },
    { name: "Late Night Slice & Review", icon: "food", offsetMinutes: 180, notes: "Post-gig pizza and debrief" },
  ],
  walk: [
    { name: "Espresso Bar Greeting", icon: "coffee", offsetMinutes: 0, notes: "Takeaway coffee and morning meetup" },
    { name: "Boardwalk & Laneways Walk", icon: "walk", offsetMinutes: 30, notes: "Scenic walking route and harbour views" },
    { name: "Waterfront Lunch & Refreshments", icon: "food", offsetMinutes: 90, notes: "Casual lunch in the sun" },
  ],
  catchup: [
    { name: "Coffee & Greeting", icon: "coffee", offsetMinutes: 0, notes: "Grab flat whites, iced matcha, and sit down to chat" },
    { name: "Laneway Walk & Conversation", icon: "walk", offsetMinutes: 45, notes: "Casual stroll and good conversation" },
    { name: "Bites or Drinks Wrap Up", icon: "food", offsetMinutes: 90, notes: "Quick bites or casual drinks wrap up" },
  ],
  meeting: [
    { name: "Meeting & Discussion", icon: "pin", offsetMinutes: 0, notes: "Sync agenda, project review and discussion" },
    { name: "Action Items & Wrap Up", icon: "pin", offsetMinutes: 45, notes: "Next steps, key decisions and calendar follow-ups" },
  ],
  custom: [
    { name: "Meeting Point & Welcome", icon: "pin", offsetMinutes: 0, notes: "Gather at the main entrance" },
    { name: "Main Gathering Activity", icon: "food", offsetMinutes: 60, notes: "Primary event activity & food" },
    { name: "Celebration Toast & Wind Down", icon: "toast", offsetMinutes: 150, notes: "Group cheers and wrap-up" },
  ],
};

function addMinutesToTime(baseTime: string, mins: number): string {
  if (!baseTime) return "19:00";
  const [hStr, mStr] = baseTime.split(":");
  const h = parseInt(hStr || "18", 10);
  const m = parseInt(mStr || "0", 10);
  const totalMins = (h * 60 + m + mins) % (24 * 60);
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

const TIME_OFFSET_CHIPS = [
  { label: "+15m", mins: 15 },
  { label: "+30m", mins: 30 },
  { label: "+45m", mins: 45 },
  { label: "+1h", mins: 60 },
  { label: "+1.5h", mins: 90 },
  { label: "+2h", mins: 120 },
];

/**
 * Clean, visible icon ribbon selector
 */
function VisibleIconPicker({
  selectedIcon,
  onSelect,
}: {
  selectedIcon: StopIconType;
  onSelect: (icon: StopIconType) => void;
}) {
  const [filterCat, setFilterCat] = useState<string>("all");

  const displayedIcons =
    filterCat === "all"
      ? STOP_ICON_OPTIONS
      : STOP_ICON_OPTIONS.filter((opt) => {
          const category = STOP_ICON_CATEGORIES.find((c) => c.name === filterCat);
          return category ? category.iconIds.includes(opt.id) : true;
        });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-mute flex items-center gap-1">
          Select Stop Icon:
          <span className="text-ink font-medium">({getStopIconDef(selectedIcon).label})</span>
        </span>

        {/* Quick Category Filter Pills */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterCat("all")}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
              filterCat === "all"
                ? "bg-brand text-white font-semibold shadow-xs"
                : "bg-paper text-mute ring-1 ring-line hover:text-ink",
            )}
          >
            All (17)
          </button>
          {STOP_ICON_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setFilterCat(cat.name)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium transition flex items-center gap-1",
                filterCat === cat.name
                  ? "bg-brand text-white font-semibold shadow-xs"
                  : "bg-paper text-mute ring-1 ring-line hover:text-ink",
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Visible Icon Buttons Grid - Single Icon Only */}
      <div className="no-scrollbar flex flex-wrap gap-1.5 pt-0.5">
        {displayedIcons.map((opt) => {
          const OptIcon = opt.icon;
          const isChosen = selectedIcon === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                onSelect(opt.id);
              }}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={isChosen}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl transition active:scale-95 ring-1",
                isChosen
                  ? "bg-brand text-white ring-brand shadow-xs"
                  : "bg-paper text-mute ring-line hover:text-ink hover:bg-paper/80",
              )}
            >
              <OptIcon size={16} className={isChosen ? "text-white" : opt.colorClass} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface ItineraryStopsManagerProps {
  stops: ItineraryStopData[];
  planType?: PlanType;
  baseStartTime?: string;
  isEditable?: boolean;
  canVote?: boolean;
  currentUserId?: string;
  onAddStop: (stop: { name: string; time?: string; notes?: string; icon?: StopIconType | string; address?: string }) => void;
  onUpdateStop: (index: number, patch: Partial<ItineraryStopData>) => void;
  onRemoveStop: (index: number) => void;
  onReorderStops: (fromIdx: number, toIdx: number) => void;
  onVoteStop?: (stopId: string) => void;
}

export function ItineraryStopsManager({
  stops,
  planType = "nightout",
  baseStartTime = "18:30",
  isEditable = true,
  canVote = false,
  currentUserId,
  onAddStop,
  onUpdateStop,
  onRemoveStop,
  onReorderStops,
  onVoteStop,
}: ItineraryStopsManagerProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Editing state for inline stop updates
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editIcon, setEditIcon] = useState<StopIconType>("food");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // New Stop form state (default showAddressNotes to true)
  const [newName, setNewName] = useState("");
  const [newTime, setNewTime] = useState(() => {
    if (stops.length > 0 && stops[stops.length - 1]?.time) {
      return addMinutesToTime(stops[stops.length - 1]!.time!, 90);
    }
    return baseStartTime;
  });
  const [newIcon, setNewIcon] = useState<StopIconType>("food");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [showAddressNotes, setShowAddressNotes] = useState(true);

  // Template suggestions for current occasion
  const templates = OCCASION_STOP_TEMPLATES[planType] || OCCASION_STOP_TEMPLATES.custom;

  const handleStartEdit = (index: number) => {
    const s = stops[index];
    if (!s) return;
    setEditingIdx(index);
    setEditName(s.name);
    setEditTime(s.time || "");
    setEditIcon((s.icon as StopIconType) || "food");
    setEditAddress(s.address || "");
    setEditNotes(s.notes || "");
  };

  const handleSaveEdit = () => {
    if (editingIdx === null) return;
    void triggerHaptic("light");
    onUpdateStop(editingIdx, {
      name: editName.trim() || stops[editingIdx]?.name,
      time: editTime.trim() || undefined,
      icon: editIcon,
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditingIdx(null);
  };

  const handleCancelEdit = () => {
    setEditingIdx(null);
  };

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;
    void triggerHaptic("light");
    onAddStop({
      name: newName.trim(),
      time: newTime.trim() || undefined,
      icon: newIcon,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    setNewName("");
    setNewAddress("");
    setNewNotes("");

    // Auto calculate next suggested time
    setNewTime((prev) => addMinutesToTime(prev || baseStartTime, 90));
  };

  const handleApplyTemplate = (tmpl: OccasionStopTemplate) => {
    void triggerHaptic("medium");
    const calculatedTime = addMinutesToTime(baseStartTime, tmpl.offsetMinutes);
    onAddStop({
      name: tmpl.name,
      time: calculatedTime,
      icon: tmpl.icon,
      notes: tmpl.notes,
    });
  };

  const handleTimeOffset = (mins: number) => {
    void triggerHaptic("light");
    setNewTime((prev) => addMinutesToTime(prev || baseStartTime, mins));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    void triggerHaptic("light");
    onReorderStops(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= stops.length - 1) return;
    void triggerHaptic("light");
    onReorderStops(index, index + 1);
  };

  const handleOpenMaps = (stopName: string, stopAddress?: string) => {
    const q = encodeURIComponent(stopAddress || stopName);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* Stops List */}
      <div className="space-y-2.5">
        {stops.length === 0 ? (
          <div className="rounded-2xl bg-paper/60 p-6 text-center ring-1 ring-dashed ring-line">
            <Sparkles size={24} className="mx-auto text-gold mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-ink">No itinerary stops added yet</p>
            <p className="text-xs text-mute mt-0.5 max-w-sm mx-auto">
              Add venue stops or choose from the occasion templates below to build your schedule.
            </p>
          </div>
        ) : (
          stops.map((stop, index) => {
            const iconDef = getStopIconDef(stop.icon);
            const StopIcon = iconDef.icon;
            const isEditing = editingIdx === index;
            const isDragOver = dragOverIdx === index && dragIdx !== null && dragIdx !== index;
            const userVoted = currentUserId && stop.voterUids?.includes(currentUserId);

            if (isEditing) {
              return (
                <div
                  key={`edit-${stop.id || index}`}
                  className="rounded-3xl bg-card p-4 sm:p-5 ring-2 ring-brand shadow-md space-y-3.5 animate-in fade-in-50"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-line/50">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Pencil size={13} className="text-brand" />
                      Editing Stop #{index + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1 rounded-full bg-brand px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition active:scale-95"
                      >
                        <Check size={12} />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-mute ring-1 ring-line hover:text-ink hover:bg-paper/80 transition active:scale-95"
                      >
                        <X size={12} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>

                  {/* Icon Selector in Edit Mode */}
                  <VisibleIconPicker
                    selectedIcon={editIcon}
                    onSelect={(icon) => setEditIcon(icon)}
                  />

                  {/* Name & Time row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Venue / stop name"
                      className="h-10 flex-1 rounded-2xl bg-paper px-3.5 text-xs sm:text-sm font-medium text-ink border border-ink outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />

                    <div className="flex items-center gap-1.5 rounded-2xl bg-paper px-3 h-10 ring-1 ring-line shrink-0">
                      <Clock size={13} className="text-mute shrink-0" />
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="bg-transparent text-xs font-mono text-ink outline-none w-20 cursor-pointer"
                      />
                      {editTime && (
                        <span className="text-[10px] font-semibold tabular-nums text-mute">
                          {formatTime12h(editTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address & Notes in Edit Mode */}
                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    <div className="relative">
                      <MapPin size={13} className="absolute left-3 top-2.5 text-gold" />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Address / Landmark (e.g. 100 George St, The Rocks)"
                        className="h-9 w-full rounded-xl bg-paper pl-8 pr-3 text-xs text-ink border border-ink outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                      />
                    </div>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3 top-2.5 text-mute" />
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Host Notes (e.g. Table booked under Sarah)"
                        className="h-9 w-full rounded-xl bg-paper pl-8 pr-3 text-xs text-ink border border-ink outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${stop.id || stop.name}-${index}`}
                draggable={isEditable}
                onDragStart={(e) => {
                  setDragIdx(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIdx !== index) setDragOverIdx(index);
                }}
                onDragLeave={() => setDragOverIdx((cur) => (cur === index ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null && dragIdx !== index) {
                    onReorderStops(dragIdx, index);
                  }
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line transition group",
                  isDragOver ? "ring-2 ring-brand" : "hover:ring-line/80",
                  dragIdx === index ? "opacity-50" : "",
                )}
              >
                {/* Drag Grip Handle */}
                {isEditable && (
                  <span
                    className="grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-mute/50 hover:text-ink active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-hidden="true"
                  >
                    <GripVertical size={15} />
                  </span>
                )}

                {/* Category Icon Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (isEditable) handleStartEdit(index);
                  }}
                  title={`Category: ${iconDef.label} (click to edit)`}
                  aria-label={`Category: ${iconDef.label}`}
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition active:scale-95",
                    iconDef.bgClass,
                    iconDef.colorClass,
                    iconDef.ringClass,
                  )}
                >
                  <StopIcon size={18} />
                </button>

                {/* Content details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-xs sm:text-sm font-semibold text-ink">{stop.name}</p>
                    {stop.time && (
                      <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-mono font-medium text-mute ring-1 ring-line">
                        {formatTime12h(stop.time)}
                      </span>
                    )}
                  </div>
                  {stop.notes && <p className="truncate text-[11px] text-mute mt-0.5">{stop.notes}</p>}
                  {stop.address && (
                    <p className="flex items-center gap-1 text-[10px] text-mute/80 truncate mt-0.5">
                      <MapPin size={10} className="text-gold shrink-0" />
                      <span className="truncate">{stop.address}</span>
                    </p>
                  )}
                  {stop.addedByName && (
                    <p className="text-[9px] text-mute/70 mt-0.5">Added by {stop.addedByName}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-1">
                  {/* Upvote Button (if canVote) */}
                  {canVote && onVoteStop && stop.id && (
                    <button
                      type="button"
                      onClick={() => onVoteStop(stop.id!)}
                      title={`Upvote stop (${stop.votes || 0} votes)`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 transition active:scale-95",
                        userVoted ? "bg-brand text-white ring-brand" : "bg-card text-mute ring-line hover:text-ink",
                      )}
                    >
                      <ThumbsUp size={11} />
                      <span className="text-[10px] tabular-nums">{stop.votes || 0}</span>
                    </button>
                  )}

                  {/* Navigation Maps Link */}
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(stop.name, stop.address)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-card text-mute ring-1 ring-line transition hover:text-brand"
                    title="Open in Maps"
                    aria-label={`Open ${stop.name} in Maps`}
                  >
                    <Navigation size={13} />
                  </button>

                  {isEditable && (
                    <>
                      {/* Mobile up/down sort buttons */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="grid h-4 w-6 place-items-center text-mute hover:text-ink disabled:opacity-20"
                          title="Move stop earlier"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={index === stops.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="grid h-4 w-6 place-items-center text-mute hover:text-ink disabled:opacity-20"
                          title="Move stop later"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(index)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card text-mute ring-1 ring-line transition hover:text-ink"
                        title="Edit stop"
                        aria-label={`Edit ${stop.name}`}
                      >
                        <Pencil size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          onRemoveStop(index);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card text-mute ring-1 ring-line transition hover:text-red-500 hover:bg-red-500/10"
                        title="Remove stop"
                        aria-label={`Remove ${stop.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Occasion Quick-Add Templates */}
      {isEditable && templates.length > 0 && (
        <div className="rounded-2xl bg-paper/50 p-3 ring-1 ring-line/70">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-gold" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Quick-Add Itinerary Templates:
            </span>
          </div>
          <div className="no-scrollbar flex flex-wrap gap-1.5">
            {templates.map((tmpl, idx) => {
              const iconDef = getStopIconDef(tmpl.icon);
              const TemplateIcon = iconDef.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-brand/10 hover:text-brand hover:ring-brand/40 transition active:scale-95"
                >
                  <TemplateIcon size={12} className={iconDef.colorClass} />
                  <span>+ {tmpl.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add a New Stop Form */}
      {isEditable && (
        <div className="rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Plus size={14} className="text-brand" />
              Add a new stop:
            </span>
            <button
              type="button"
              onClick={() => setShowAddressNotes((v) => !v)}
              className="text-[11px] font-medium text-mute hover:text-brand transition flex items-center gap-1"
            >
              <span>{showAddressNotes ? "Hide address & notes" : "+ Add address & notes"}</span>
              <ChevronDown
                size={12}
                className={cn("transition-transform duration-200", showAddressNotes ? "rotate-180" : "")}
              />
            </button>
          </div>

          {/* Direct Visible Icon Selector */}
          <VisibleIconPicker
            selectedIcon={newIcon}
            onSelect={(icon) => setNewIcon(icon)}
          />

          {/* Main Input Row: Venue Name + Time + Add Button */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Stop / venue name (e.g. Opera Bar, Ceremony Hall, Cake Cutting)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubmit();
                }
              }}
              className="h-11 flex-1 rounded-2xl bg-paper px-3.5 text-xs sm:text-sm font-medium border border-ink outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
            />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-2xl bg-paper px-3 h-11 ring-1 ring-line shrink-0">
                <Clock size={14} className="text-mute shrink-0" />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-mono text-ink outline-none w-20 cursor-pointer"
                  title="Stop arrival time"
                />
                {newTime && (
                  <span className="text-[10px] sm:text-[11px] font-semibold tabular-nums text-mute hidden sm:inline">
                    {formatTime12h(newTime)}
                  </span>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => handleAddSubmit()}
                disabled={!newName.trim()}
                className="shrink-0 gap-1.5 rounded-2xl h-11 px-4 font-bold disabled:opacity-40"
              >
                <Plus size={15} />
                <span>Add Stop</span>
              </Button>
            </div>
          </div>

          {/* Quick Time Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-mute flex items-center gap-1">
              <Clock size={10} />
              Quick Offset:
            </span>
            {TIME_OFFSET_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleTimeOffset(chip.mins)}
                className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-medium text-mute ring-1 ring-line hover:text-ink hover:bg-brand/10 hover:ring-brand/40 transition active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Address & Notes (Shown by default, collapsible) */}
          {showAddressNotes && (
            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-line/60 animate-in fade-in-50">
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-3 text-gold" />
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Address / Landmark (e.g. 1 Macquarie St, Sydney)"
                  className="h-10 w-full rounded-xl bg-paper pl-9 pr-3 text-xs text-ink border border-ink outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
              <div className="relative">
                <FileText size={14} className="absolute left-3.5 top-3 text-mute" />
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Host Notes (e.g. Meet in lobby, dress code smart casual)"
                  className="h-10 w-full rounded-xl bg-paper pl-9 pr-3 text-xs text-ink border border-ink outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
