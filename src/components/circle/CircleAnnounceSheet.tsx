import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { createBroadcastRemote } from "@/lib/notifications";
import { liveBackendEnabled } from "@/lib/functions";

export function CircleAnnounceSheet({
  open,
  onClose,
  audienceCount,
  handle,
}: {
  open: boolean;
  onClose: () => void;
  audienceCount: number;
  handle?: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    if (!handle) {
      toast.message("Claim a @handle first so your Circle can find you.");
      return;
    }
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to send to your Circle.");
      return;
    }
    setBusy(true);
    try {
      const res = await createBroadcastRemote({
        title: title.trim(),
        body: body.trim(),
        audience: "circle",
      });
      const n = res.sent ?? 0;
      toast.success(n ? `Sent to ${n} in your Circle` : "Sent — invite people so they see it next time");
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
    <Sheet open={open} onClose={onClose} title="Announce">
      <p className="text-[15px] leading-6 text-mute">
        A short note to people who follow you. Not the whole platform — your Circle.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold text-mute">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Tonight at The Glenmore"
          className={`${fieldInput} mt-1`}
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[13px] font-semibold text-mute">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 280))}
          rows={4}
          placeholder="Doors at 7. Come through."
          className={`${fieldTextarea} mt-1 min-h-28`}
        />
        <span className="mt-1 block text-right text-[11px] text-mute">{body.length}/280</span>
      </label>
      <Button
        className="mt-4 w-full"
        disabled={busy || !title.trim() || !body.trim()}
        loading={busy}
        onClick={() => void send()}
      >
        Send to Circle{audienceCount ? ` · ${audienceCount}` : ""}
      </Button>
      <button type="button" className="mt-3 w-full text-center text-[15px] font-medium text-mute" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
