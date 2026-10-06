import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { scheduleCatchUpRemote } from "@/lib/functions";
import type { CatchUpItem } from "@/lib/catchup";

/** Suggested times from the catch-up scheduler, and the jump into the meeting thread. */
export function CatchUpSlotActions({ item }: { item: CatchUpItem }) {
  const [, nav] = useLocation();
  const [busy, setBusy] = useState("");
  const slots = item.proposals || [];

  async function run(action: "open" | "accept", slotId?: string) {
    const key = slotId || action;
    if (busy) return;
    setBusy(key);
    try {
      const res = await scheduleCatchUpRemote({ catchupId: item.id, action, slotId });
      toast.success(action === "accept" ? "Time locked in" : "Suggested times are in the thread");
      nav(`/me/inbox?chat=${encodeURIComponent(res.conversationId)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't schedule that catch-up.";
      toast.error(message.replace(/^functions\/[a-z-]+:\s*/i, ""));
    } finally {
      setBusy("");
    }
  }

  if (item.status === "scheduled" && item.conversationId) {
    return (
      <button
        type="button"
        onClick={() => nav(`/me/inbox?chat=${encodeURIComponent(item.conversationId || "")}`)}
        className="inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center rounded-full bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Open thread
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void run("accept", slot.id)}
          className="inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center rounded-full bg-brand/10 px-3 text-[12px] font-semibold text-accent ring-1 ring-brand/20 transition-colors hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === slot.id ? "Locking…" : slot.label}
        </button>
      ))}
      {slots.length === 0 ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void run("open")}
          className="inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center rounded-full bg-paper px-3 text-[12px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "open" ? "Suggesting…" : "Suggest times"}
        </button>
      ) : null}
    </div>
  );
}
