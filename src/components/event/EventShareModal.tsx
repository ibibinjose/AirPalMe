import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, QrCode, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { makeQrDataUrl } from "@/lib/qr";
import { useBio } from "@/contexts/BioContext";
import { toPublicUrl } from "@/lib/public-origin";

export interface EventShareModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  title: string;
  venue?: string;
  date?: string;
  heroImage?: string;
}

export function EventShareModal({ open, onClose, eventId, title, venue, date, heroImage }: EventShareModalProps) {
  const { mine } = useBio();
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [showQr, setShowQr] = useState(false);

  // Generate viral referral URL with the user's @handle if available
  const handle = mine?.handle?.replace(/^@+/, "");
  const path = `/e/${eventId}${handle ? `?ref=${handle}` : ""}`;
  const shareUrl = toPublicUrl(path);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void makeQrDataUrl(shareUrl).then((dataUrl) => {
      if (alive) setQrUrl(dataUrl);
    });
    return () => {
      alive = false;
    };
  }, [open, shareUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(handle ? "Invite link with your @handle copied!" : "Event link copied!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const shareText = `Join me at ${title}${venue ? ` at ${venue}` : ""}! RSVP on AirPal:`;

  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(url, "_blank");
  };

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const shareSms = () => {
    const url = `sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.location.href = url;
  };

  return (
    <Sheet open={open} onClose={onClose} title="Share & Invite">
      <div className="space-y-4 pt-1">
        {/* Event Preview Capsule */}
        <div className="flex items-center gap-3 rounded-2xl bg-paper/80 p-3 ring-1 ring-line/80">
          {heroImage ? (
            <img src={heroImage} alt={title} className="h-14 w-14 rounded-xl object-cover ring-1 ring-line shrink-0" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-accent font-bold text-lg ring-1 ring-brand/20 shrink-0">
              {title.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-ink truncate">{title}</h4>
            {(date || venue) && (
              <p className="text-xs text-mute truncate mt-0.5">{[date, venue].filter(Boolean).join(" · ")}</p>
            )}
            {handle && (
              <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-1">
                Viral invite tag: @{handle}
              </span>
            )}
          </div>
        </div>

        {/* Link Copy Bar */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute block">Invite Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="h-11 flex-1 rounded-2xl border border-line bg-paper px-3 text-xs text-ink font-mono outline-none truncate"
            />
            <Button
              type="button"
              variant={copied ? "tonal" : "primary"}
              className="h-11 px-4 gap-1.5 rounded-2xl shrink-0"
              onClick={copyToClipboard}
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Social Share Buttons */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute block">Send via</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200 transition active:scale-95"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={shareTwitter}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-sky-50 hover:text-sky-700 hover:ring-sky-200 transition active:scale-95"
            >
              <Twitter size={15} className="text-sky-500" />
              <span>X / Post</span>
            </button>

            <button
              type="button"
              onClick={shareSms}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-amber-50 hover:text-amber-800 hover:ring-amber-200 transition active:scale-95"
            >
              <Share2 size={15} className="text-amber-600" />
              <span>iMessage</span>
            </button>
          </div>
        </div>

        {/* In-Person QR Code Toggle */}
        <div className="border-t border-line/60 pt-3">
          <button
            type="button"
            onClick={() => setShowQr((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl bg-paper/60 px-3.5 py-2.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <span className="flex items-center gap-2">
              <QrCode size={15} className="text-accent" />
              <span>Show In-Person Scan QR</span>
            </span>
            <span className="text-[11px] text-mute">{showQr ? "Hide" : "Show"}</span>
          </button>

          {showQr && qrUrl && (
            <div className="mt-3 text-center space-y-2 p-3 bg-white rounded-2xl ring-1 ring-line">
              <img src={qrUrl} alt="Event RSVP QR Code" className="mx-auto h-44 w-44 rounded-xl" />
              <p className="text-[11px] font-medium text-mute">Point your phone camera here to open and RSVP</p>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
