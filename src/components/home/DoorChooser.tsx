import { BedDouble, CalendarDays, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { hrefForDoor, type DoorId } from "@/lib/door";
import { triggerHaptic } from "@/lib/native";

const DOORS: Array<{ id: DoorId; title: string; line: string; icon: typeof Sparkles }> = [
  {
    id: "plan",
    title: "Plan with people",
    line: "Family and friends. Create, share, show up.",
    icon: CalendarDays,
  },
  {
    id: "explore",
    title: "See what’s on",
    line: "Public nights and places near your pin.",
    icon: Sparkles,
  },
  {
    id: "stay",
    title: "I’m staying here",
    line: "Scan a room or lobby code for Wi-Fi and the desk.",
    icon: BedDouble,
  },
];

export function DoorChooser({ onPick }: { onPick: (id: DoorId) => void }) {
  const [, nav] = useLocation();

  function pick(id: DoorId) {
    void triggerHaptic("medium");
    onPick(id);
    nav(hrefForDoor(id));
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">What do you need?</h1>
      <p className="mt-1 text-sm text-mute">Three doors. Pick one — you can switch anytime.</p>
      <div className="mt-6 grid gap-3">
        {DOORS.map((door) => {
          const Icon = door.icon;
          return (
            <button
              key={door.id}
              type="button"
              onClick={() => pick(door.id)}
              className="flex items-start gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-line transition hover:ring-brand/40"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold">{door.title}</span>
                <span className="mt-0.5 block text-[13px] text-mute">{door.line}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
