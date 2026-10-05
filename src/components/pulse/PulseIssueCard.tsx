import { Button } from "@/components/ui/Button";
import type { PulseIssue } from "@shared/pulse";

export function PulseIssueCard({
  issue,
  note,
  onNoteChange,
  onAcknowledge,
  onResolve,
}: {
  issue: PulseIssue;
  note: string;
  onNoteChange: (value: string) => void;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          {issue.category} · Score {issue.primaryScore ?? "?"}/5
        </span>
        <span className="text-xs text-mute">{issue.status}</span>
      </div>

      <div className="text-sm font-semibold leading-relaxed text-ink">{issue.summary}</div>

      {issue.contactRequested && (
        <div className="space-y-1 rounded-xl bg-paper p-3 text-xs ring-1 ring-line">
          <div className="font-semibold text-brand">Guest Requested Contact:</div>
          <div>Name: {issue.contactName || "Guest"}</div>
          <div>Method: {issue.contactMethod || "Not provided"}</div>
        </div>
      )}

      <div className="space-y-2 border-t border-line pt-2">
        {issue.status === "open" && (
          <Button variant="ghost" className="w-full" onClick={onAcknowledge}>
            Acknowledge Issue
          </Button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Resolution note"
            placeholder="Resolution note (e.g. comped drink, apologized)"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="h-11 flex-1 rounded-full bg-paper px-4 text-xs text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand/40"
          />
          <button
            type="button"
            onClick={onResolve}
            className="min-h-[44px] rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
