import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { sendPlanBroadcastRemote, liveBackendEnabled } from "@/lib/functions";
import { PLAN_BROADCAST_BODY_MAX, PLAN_BROADCAST_TITLE_MAX } from "@shared/plan-notify";

/** Host-only blast to everyone "going" — one update, not a group chat. */
export function PlanBroadcastSheet({
  open,
  onClose,
  planId,
  planTitle,
  goingCount,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
  goingCount: number;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to message your crew.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendPlanBroadcastRemote({ planId, title: title.trim(), body: body.trim() });
      toast.success(res.sent ? `Sent to ${res.sent} going` : "No one going yet — invite mates first");
      setTitle("");
      setBody("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Message going">
      <p className="text-[15px] leading-6 text-mute">
        One update about “{planTitle}” to everyone going. Day-before and day-of reminders go out on their own.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold text-mute">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, PLAN_BROADCAST_TITLE_MAX))}
          placeholder="Doors at 7, come through"
          className={`${fieldInput} mt-1`}
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[13px] font-semibold text-mute">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, PLAN_BROADCAST_BODY_MAX))}
          rows={4}
          placeholder="Running 10 min late — start without me."
          className={`${fieldTextarea} mt-1 min-h-28`}
        />
        <span className="mt-1 block text-right text-[11px] text-mute">
          {body.length}/{PLAN_BROADCAST_BODY_MAX}
        </span>
      </label>
      <Button
        className="mt-4 w-full"
        disabled={busy || !title.trim() || !body.trim()}
        loading={busy}
        onClick={() => void send()}
      >
        Send{goingCount ? ` · ${goingCount} going` : ""}
      </Button>
      <button type="button" className="mt-3 w-full text-center text-[15px] font-medium text-mute" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
