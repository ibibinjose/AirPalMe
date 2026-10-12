import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SchedulePick {
  id: string;
  label: string;
  sublabel: string;
  getDates: () => { startsLocal: string; endsLocal: string };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDateAhead(targetDay: number, startHour: number, durationHours: number) {
  const d = new Date();
  const currentDay = d.getDay();
  let add = (targetDay - currentDay + 7) % 7;
  if (add === 0 && d.getHours() >= startHour) {
    add = 7;
  }
  d.setDate(d.getDate() + add);
  d.setHours(startHour, 0, 0, 0);

  const end = new Date(d);
  end.setHours(d.getHours() + durationHours);

  return { startsLocal: toLocal(d), endsLocal: toLocal(end) };
}

export const SCHEDULE_PICKS: SchedulePick[] = [
  {
    id: "fri_night",
    label: "Friday Night",
    sublabel: "7 PM – 11 PM",
    getDates: () => getDateAhead(5, 19, 4),
  },
  {
    id: "sat_morning",
    label: "Saturday Morning",
    sublabel: "9 AM – 3 PM",
    getDates: () => getDateAhead(6, 9, 6),
  },
  {
    id: "sat_night",
    label: "Saturday Night",
    sublabel: "6 PM – 10 PM",
    getDates: () => getDateAhead(6, 18, 4),
  },
  {
    id: "sun_afternoon",
    label: "Sunday Lunch",
    sublabel: "12 PM – 4 PM",
    getDates: () => getDateAhead(0, 12, 4),
  },
  {
    id: "next_sat",
    label: "Next Saturday",
    sublabel: "10 AM – 6 PM",
    getDates: () => {
      const { startsLocal, endsLocal } = getDateAhead(6, 10, 8);
      const s = new Date(startsLocal);
      s.setDate(s.getDate() + 7);
      const e = new Date(endsLocal);
      e.setDate(e.getDate() + 7);
      return { startsLocal: toLocal(s), endsLocal: toLocal(e) };
    },
  },
];

export interface EventScheduleQuickPicksProps {
  onSelect: (dates: { startsLocal: string; endsLocal: string }) => void;
  className?: string;
}

export function EventScheduleQuickPicks({ onSelect, className }: EventScheduleQuickPicksProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-mute">
          <Calendar size={12} className="text-accent" />
          <span>Quick Schedule Shortcuts</span>
        </span>
        <span className="text-[11px] text-mute">1-tap timing</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {SCHEDULE_PICKS.map((pick) => (
          <button
            key={pick.id}
            type="button"
            onClick={() => onSelect(pick.getDates())}
            className="flex flex-col items-start rounded-2xl bg-paper px-3 py-2 text-left ring-1 ring-line/80 transition-all hover:bg-card hover:ring-brand/30 hover:shadow-xs active:scale-95"
          >
            <span className="text-xs font-bold text-ink leading-tight">{pick.label}</span>
            <span className="text-[10px] font-medium text-mute mt-0.5">{pick.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
