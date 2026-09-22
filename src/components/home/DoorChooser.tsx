import { BedDouble, CalendarDays, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { hrefForDoor, type DoorId } from "@/lib/door";
import { triggerHaptic } from "@/lib/native";

const DOORS: Array<{ id: DoorId; title: string; line: string; icon: typeof Sparkles }> = [
  {
    id: "plan",
    title: "Plan with people",
    line: "Create it. Share it. Show up.",
    icon: CalendarDays,
  },
  {
    id: "explore",
    title: "See what’s on",
    line: "Nights and places near you.",
    icon: Sparkles,
  },
  {
    id: "stay",
    title: "I’m staying here",
    line: "Scan the room. Wi-Fi and the desk.",
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
      <h1 className="font-display text-3xl font-semibold">What do you need?</h1>
      <div className="mt-6 grid gap-3">
        {DOORS.map((door) => {
          const Icon = door.icon;
          return (
            <button
              key={door.id}
              type="button"
              onClick={() => pick(door.id)}
              className="flex items-center gap-3 rounded-[28px] bg-card p-4 text-left ring-1 ring-line transition hover:ring-brand/30 active:scale-[0.99]"
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
