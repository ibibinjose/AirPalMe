import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { freshnessOf, type FreshnessKind } from "@shared/freshness";

export function HostFreshnessBanner({
  kind,
  at,
  onConfirm,
}: {
  kind: Exclude<FreshnessKind, "wifi">;
  at?: string;
  onConfirm: () => Promise<void>;
}) {
  const fresh = freshnessOf(at, kind);
  const [busy, setBusy] = useState(false);
  if (!fresh.stale) {
    return <p className="text-xs text-mute">{fresh.confirmedLabel}</p>;
  }
  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/80">
      <p className="text-sm font-medium text-amber-950">{fresh.hostNudge}</p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onConfirm().finally(() => setBusy(false));
        }}
      >
        {kind === "hours" ? "Hours still right" : "Tonight still right"}
      </Button>
    </div>
  );
}
