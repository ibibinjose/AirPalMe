import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Promotion } from "@shared/promotions";

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink/10 py-2 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">{label}</span>
      <span className="whitespace-pre-line text-sm">{value}</span>
    </div>
  );
}

/** Neutral, reusable official-terms block. Never generates legal claims. */
export function PromotionTerms({ promotion, defaultOpen = false }: { promotion: Promotion; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl ring-1 ring-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-4 text-left"
        aria-expanded={open}
      >
        <FileText size={18} className="shrink-0 text-brand" />
        <span className="flex-1 text-sm font-bold">Official promotion terms</span>
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <Row label="What is it" value={promotion.description} />
          <Row label="Who is eligible" value={promotion.eligibility} />
          <Row label="How it works" value={promotion.entryRules} />
          <Row label="When it ends" value={promotion.endAt ? new Date(promotion.endAt).toLocaleString() : ""} />
          <Row label="Prize" value={promotion.prizeValue || promotion.prize.title} />
          <Row label="Winner method" value={promotion.winnerSelectionMethod} />
          <Row
            label="Winner announcement"
            value={promotion.winnerAnnouncementAt ? new Date(promotion.winnerAnnouncementAt).toLocaleString() : ""}
          />
          <Row label="Sponsor" value={promotion.sponsorName} />
          <Row label="Contact" value={promotion.contactEmail} />
          <Row label="Jurisdiction" value={promotion.jurisdiction} />
          <Row label="Privacy" value={promotion.privacyNote} />
          {promotion.termsText && <p className="whitespace-pre-line pt-3 text-sm text-mute">{promotion.termsText}</p>}
          <p className="pt-3 text-xs text-mute">Subject to the official promotion terms.</p>
        </div>
      )}
    </div>
  );
}
