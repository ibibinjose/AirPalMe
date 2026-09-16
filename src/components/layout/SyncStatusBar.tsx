import { useEffect, useState } from "react";
import { Cloud, CloudOff, LoaderCircle, RotateCw } from "lucide-react";
import { useOptionalSync } from "@/contexts/SyncContext";
import { syncLabel, worstSyncState } from "@/lib/sync";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";

export function SyncStatusBar() {
  const sync = useOptionalSync();
  const { t } = useLocale();
  const jobs = sync?.jobs || [];
  const active = jobs.filter((job) => job.state !== "synced");
  const latestSynced = jobs.find((job) => job.state === "synced");
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (!latestSynced || active.length) {
      setShowSynced(false);
      return;
    }
    setShowSynced(true);
    const timer = window.setTimeout(() => setShowSynced(false), 2400);
    return () => window.clearTimeout(timer);
  }, [active.length, latestSynced?.updatedAt]);

  const visible = active.length ? active : showSynced && latestSynced ? [latestSynced] : [];
  if (!visible.length) return null;

  const state = worstSyncState(visible);
  if (!state) return null;
  const job = visible.find((row) => row.state === state) || visible[0]!;
  const failed = state === "failed" || state === "pending_retry";
  const powerSave = Boolean(sync?.powerSaveActive);

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-1.5 text-[12px]",
        failed ? "bg-ink text-white" : "bg-card/90 text-mute",
      )}
    >
      {state === "syncing" && <LoaderCircle size={12} className="animate-spin" />}
      {state === "synced" && <Cloud size={12} />}
      {state === "local" && <CloudOff size={12} />}
      {failed && <CloudOff size={12} />}
      <span>
        {job.label}: {t(`sync.${state}`) || syncLabel(state, powerSave)}
      </span>
      {powerSave && state === "pending_retry" && (
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
          Power Saver (delayed)
        </span>
      )}
      {state === "failed" && sync && (
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium underline"
          onClick={() => void sync.retry(job.id)}
        >
          <RotateCw size={11} />
          {t("retry")}
        </button>
      )}
    </div>
  );
}
