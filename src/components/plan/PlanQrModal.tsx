import { useEffect, useState } from "react";
import { Check, Copy, Download, Printer, QrCode, Share2, Sparkles, X } from "lucide-react";
import { type HangoutPlan, formatPlanDate, planInviteUrl, PLAN_TYPES, EXPERIENCE_CATEGORIES } from "@shared/plan";
import { makeQrDataUrl } from "@/lib/qr";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { triggerHaptic, shareNative } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { exportPlanItineraryPdf } from "@/lib/plan-pdf";
import { publicSiteOrigin, toPublicUrl } from "@/lib/public-origin";

interface PlanQrModalProps {
  plan: HangoutPlan;
  isOpen: boolean;
  onClose: () => void;
}

export function PlanQrModal({ plan, isOpen, onClose }: PlanQrModalProps) {
  useScrollLock(isOpen);

  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const origin = publicSiteOrigin();
  const inviteUrl = toPublicUrl(planInviteUrl(plan.id, origin));

  const typeInfo = PLAN_TYPES[plan.type] || PLAN_TYPES.custom;
  const occasionBadge =
    plan.isExperience && plan.experienceCategory
      ? `${EXPERIENCE_CATEGORIES[plan.experienceCategory]?.emoji || "✨"} ${EXPERIENCE_CATEGORIES[plan.experienceCategory]?.label || "Experience"}`
      : typeInfo.label;

  useEffect(() => {
    if (!isOpen) return;
    void makeQrDataUrl(inviteUrl, 360).then(setQrUrl);
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  const onCopy = async () => {
    try {
      void triggerHaptic("light");
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Event link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const onDownloadQr = () => {
    if (!qrUrl) return;
    void triggerHaptic("medium");
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    a.click();
    toast.success("QR code downloaded as PNG!");
  };

  const onPrintPdf = async () => {
    try {
      setIsPrinting(true);
      void triggerHaptic("medium");
      const done = await exportPlanItineraryPdf(plan);
      toast.success(
        done === "shared"
          ? "Plan link shared — open it in Safari or Chrome to print the guide."
          : "Itinerary PDF opened for print & save!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  const onNativeShare = async () => {
    void triggerHaptic("light");
    const shared = await shareNative({
      title: plan.title,
      text: `Join "${plan.title}" with me on AirPal! RSVP & view full itinerary:`,
      url: inviteUrl,
    });
    if (!shared) {
      await onCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="scroll-container modal-safe relative w-full max-w-sm sm:max-w-md rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line/60">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
              <QrCode size={18} />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold block">
                Instant In-Person Scan
              </span>
              <h2 className="font-display text-lg font-bold text-ink leading-tight">Share as QR Code</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:bg-paper hover:text-ink transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="relative group p-4 rounded-3xl bg-white shadow-xl ring-1 ring-black/10">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR code for ${plan.title}`}
                width={256}
                height={256}
                className="h-56 w-56 sm:h-64 sm:w-64 rounded-2xl object-contain mx-auto"
              />
            ) : (
              <div className="h-56 w-56 sm:h-64 sm:w-64 grid place-items-center bg-zinc-50 rounded-2xl">
                <QrCode size={48} className="animate-pulse text-zinc-400" />
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-900">
              <Sparkles size={13} className="text-amber-500" />
              <span>Scan to RSVP & Join</span>
            </div>
          </div>

          {/* Event Context Pill */}
          <div className="mt-4 max-w-xs space-y-1">
            <span className="inline-block rounded-full bg-paper px-3 py-1 text-[11px] font-bold text-ink ring-1 ring-line">
              {occasionBadge}
            </span>
            <h3 className="font-display text-base font-bold text-ink line-clamp-1">{plan.title}</h3>
            <p className="text-xs text-mute">
              {formatPlanDate(plan.date, plan.time)} · {plan.destination || plan.city}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onCopy}
              variant="ghost"
              className="h-11 rounded-2xl text-xs font-semibold gap-1.5 ring-1 ring-line bg-paper text-ink"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Copied Link" : "Copy Link"}</span>
            </Button>

            <Button
              onClick={onDownloadQr}
              variant="ghost"
              className="h-11 rounded-2xl text-xs font-semibold gap-1.5 ring-1 ring-line bg-paper text-ink"
            >
              <Download size={14} />
              <span>Save Image</span>
            </Button>
          </div>

          <Button
            onClick={onPrintPdf}
            disabled={isPrinting}
            className="w-full h-11 rounded-2xl text-xs font-bold gap-2 shadow-md bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
          >
            <Printer size={15} />
            <span>{isPrinting ? "Preparing PDF…" : "Export & Print PDF Trip Guide"}</span>
          </Button>

          <Button
            onClick={onNativeShare}
            variant="ghost"
            className="w-full h-9 rounded-xl text-xs font-medium text-mute hover:text-ink gap-1.5"
          >
            <Share2 size={13} />
            <span>Share via WhatsApp / Messages</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
