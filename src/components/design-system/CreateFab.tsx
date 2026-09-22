import { useState } from "react";
import { useLocation } from "wouter";
import {
  CalendarPlus,
  Plane,
  Plus,
  QrCode,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

/**
 * The one AirPal floating action (§12): a single + that opens a calm
 * Create sheet. Every destination is an existing route — no function lost:
 * Scan stays reachable here + via Home quick actions.
 */
const ACTIONS = [
  { icon: Plane, label: "Plan a Trip", sub: "Destination, dates, people", href: "/plan/new" },
  { icon: Ticket, label: "Create an Event", sub: "Public or circle-only", href: "/event/new" },
  { icon: CalendarPlus, label: "Add to Trip", sub: "Places, stays, notes", href: "/plan" },
  { icon: Sparkles, label: "Share a Moment", sub: "Travel-linked, not a feed", href: "/me/memories" },
  { icon: Users, label: "Invite Friends", sub: "Circle + trip invites", href: "/circle" },
  { icon: QrCode, label: "Scan", sub: "Stay QR + waves", href: "/scan" },
];

export function CreateFab() {
  const [, nav] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void triggerHaptic("medium");
          setOpen(true);
        }}
        aria-label="Create"
        className={cn(
          "fixed-element fixed bottom-24 right-4 z-40 grid h-14 w-14 touch-manipulation place-items-center rounded-full",
          "bg-ink text-white shadow-xl transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8",
        )}
      >
        <Plus size={24} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Create">
        <ul className="space-y-1 pb-2">
          {ACTIONS.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  nav(a.href);
                }}
                className="flex w-full cursor-pointer touch-manipulation items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-paper active:scale-[0.99]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <a.icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{a.label}</span>
                  <span className="block truncate text-[13px] text-mute">{a.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
