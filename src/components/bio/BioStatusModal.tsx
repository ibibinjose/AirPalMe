import { useEffect, useState } from "react";
import { Check, Sparkles, X, Smile } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { AVAILABILITY_STATUSES, resolveStatusPicks, type AvailabilityStatus } from "@shared/bio";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface BioStatusModalProps {
  open: boolean;
  onClose: () => void;
  handle: string;
  currentStatus?: AvailabilityStatus;
  currentCustomStatus?: string;
  currentEmoji?: string;
  onSaved?: (status: AvailabilityStatus, customStatus?: string, emoji?: string) => void;
}

const EMOJI_PRESETS = ["☕", "💻", "🍸", "🚶", "✈️", "⚡", "🎉", "🎧", "🌴", "📚", "🍕", "🧘"];

const QUICK_STATUS_PRESETS = [
  { emoji: "✨", text: "Building a Better Tomorrow for Humanity." },
  { emoji: "☕", text: "Available for coffee & catch up" },
  { emoji: "⚡", text: "Open to meet & collaborate" },
  { emoji: "💻", text: "Deep work / In a focus session" },
  { emoji: "🚶", text: "Out exploring the precinct" },
  { emoji: "🍸", text: "Down for drinks & hangout" },
  { emoji: "✈️", text: "Travelling / Out of town" },
];

export function BioStatusModal({
  open,
  onClose,
  handle,
  currentStatus = "available",
  currentCustomStatus = "",
  currentEmoji = "☕",
  onSaved,
}: BioStatusModalProps) {
  const { updateProfile } = useBio();
  const initial = resolveStatusPicks({ status: currentStatus, customStatus: currentCustomStatus, emoji: currentEmoji });
  const [status, setStatus] = useState<AvailabilityStatus>(initial.status);
  const [customText, setCustomText] = useState(initial.customText);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [saving, setSaving] = useState(false);

  // The modal stays mounted while closed, so resync picks when it reopens.
  useEffect(() => {
    if (open) {
      const picks = resolveStatusPicks({
        status: currentStatus,
        customStatus: currentCustomStatus,
        emoji: currentEmoji,
      });
      setStatus(picks.status);
      setCustomText(picks.customText);
      setEmoji(picks.emoji);
    }
  }, [open, currentStatus, currentCustomStatus, currentEmoji]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        handle,
        availabilityStatus: status,
        openNow: status === "available",
        customStatus: customText.trim() || undefined,
        customStatusEmoji: emoji || undefined,
      });

      toast.success("Status updated!");
      onSaved?.(status, customText.trim() || undefined, emoji || undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await updateProfile({
        handle,
        availabilityStatus: "available",
        openNow: true,
        customStatus: undefined,
        customStatusEmoji: undefined,
      });

      setStatus("available");
      setCustomText("");
      toast.success("Status cleared");
      onSaved?.("available", undefined, undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/65 p-4 backdrop-blur-sm sm:p-6 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bio-status-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-paper shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/60 bg-gradient-to-r from-card via-paper to-card px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gold/15 text-gold">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 id="bio-status-modal-title" className="font-display text-base font-bold text-ink">
                Status
              </h2>
              <p className="text-[11px] text-mute font-medium">On your bio and in Circle</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink hover:bg-paper transition"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Availability Status Ring Options */}
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-2">
              Availability Ring
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AVAILABILITY_STATUSES) as AvailabilityStatus[]).map((key) => {
                const info = AVAILABILITY_STATUSES[key];
                const isSelected = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all",
                      isSelected
                        ? "bg-card border-brand shadow-xs ring-1 ring-brand/30"
                        : "bg-card/50 border-line hover:bg-card hover:border-line/80",
                    )}
                  >
                    <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", info.dotColor)} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-ink block truncate">{info.label}</span>
                      <span className="text-[10px] text-mute truncate block">{info.description}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp-Style Custom Status Message */}
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-2">
              What&apos;s on?
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-card p-1.5 ring-1 ring-line">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-paper ring-1 ring-line text-lg shrink-0">
                {emoji || "💬"}
              </div>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="What's your status? (e.g. Available for coffee)"
                maxLength={60}
                className="flex-1 bg-transparent px-2 text-xs font-medium text-ink outline-none"
              />
              {customText && (
                <button
                  type="button"
                  onClick={() => setCustomText("")}
                  className="p-1 rounded-lg text-mute hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Emoji Quick Picker */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
              <span className="text-[10px] font-semibold text-mute shrink-0 mr-1 flex items-center gap-1">
                <Smile size={11} /> Emoji:
              </span>
              {EMOJI_PRESETS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-sm flex items-center justify-center transition shrink-0",
                    emoji === em ? "bg-brand/15 ring-1 ring-brand scale-110" : "hover:bg-card",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Quick Status Presets */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[10px] font-semibold text-mute uppercase tracking-wider block">
                Quick Status Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_STATUS_PRESETS.map((p) => (
                  <button
                    key={p.text}
                    type="button"
                    onClick={() => {
                      setEmoji(p.emoji);
                      setCustomText(p.text);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-ink ring-1 ring-line hover:bg-paper transition"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line/60 bg-card/50 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={saving}
            className="rounded-full text-xs text-mute hover:text-ink px-3"
          >
            Clear Status
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-brand text-white text-xs font-semibold px-4 shadow-sm hover:bg-brand-ink"
            >
              Save Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
