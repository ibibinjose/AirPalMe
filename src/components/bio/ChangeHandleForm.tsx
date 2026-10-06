import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { handleError, normalizeHandle } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";

export function ChangeHandleForm({
  current,
  profileId,
  compact,
}: {
  current: string;
  profileId?: string;
  compact?: boolean;
}) {
  const { transferHandle, handleFree } = useBio();
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const h = normalizeHandle(next);
    const err = handleError(h);
    if (err) {
      toast.error(err);
      return;
    }
    if (h === current) {
      toast.message(`You already use @${current}`);
      return;
    }
    setBusy(true);
    try {
      const free = await handleFree(h, profileId);
      if (!free.ok) throw new Error(free.reason || "Taken");
      const saved = await transferHandle(current, h);
      setNext("");
      setHint("");
      toast.success(`Your handle is @${saved}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change handle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">@handle</p>
          <p className="text-sm text-mute">
            Current <span className="font-semibold text-ink">@{current}</span>. Changing it updates your public page
            and account. Old links to the previous handle stop working.
          </p>
        </>
      )}
      <div className="flex items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
        <span className="shrink-0 px-3 text-sm font-semibold text-mute">@</span>
        <input
          value={next}
          onChange={(e) => {
            const h = normalizeHandle(e.target.value);
            setNext(h);
            setHint("");
            if (h && h !== current) {
              void handleFree(h, profileId).then((r) => setHint(r.ok ? "Available" : r.reason || "Taken"));
            }
          }}
          placeholder="newhandle"
          autoComplete="off"
          autoCapitalize="none"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {hint && <p className={`text-xs ${hint === "Available" ? "text-emerald-700" : "text-rose-700"}`}>{hint}</p>}
      <Button type="submit" variant={compact ? "ghost" : "primary"} className="w-full border border-line" disabled={busy || !next}>
        {busy ? "Saving…" : "Change @handle"}
      </Button>
    </form>
  );
}
