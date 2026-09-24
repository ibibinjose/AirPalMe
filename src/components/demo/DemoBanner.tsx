import { useEffect, useState } from "react";
import { Check, Copy, Info, QrCode, Share2, X } from "lucide-react";
import { Link } from "wouter";
import { useScrollLock } from "@/hooks/useScrollLock";
import { shareNative, triggerHaptic } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import { makeQrDataUrl } from "@/lib/qr";
import { toast } from "sonner";

const DEMO_URL = toPublicUrl("/DemoHotel");
const HIDE_KEY = "airpal.demo.banner.hidden";

function DemoShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useScrollLock(open);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    void makeQrDataUrl(DEMO_URL, 320).then(setQrUrl);
  }, [open ]);

  if (!open) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const onShare = async () => {
    void triggerHaptic("light");
    const shared = await shareNative({
      title: "AirPal live demo",
      text: "See what a guest sees at an AirPal Stay — scan-free live demo:",
      url: DEMO_URL,
    });
    if (!shared) await onCopy();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="scroll-container modal-safe relative max-h-[90vh] w-full max-w-md rounded-t-[32px] bg-card p-6 shadow-2xl ring-1 ring-line sm:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-line/60 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Show someone AirPal</h2>
            <p className="mt-0.5 text-[13px] text-mute">One link or scan — no app, no sign-in.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share sheet"
            className="grid h-8 w-8 place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {qrUrl && (
          <img
            src={qrUrl}
            alt="QR code for the AirPal live demo"
            width={200}
            height={200}
            className="mx-auto mt-5 h-50 w-50 rounded-2xl bg-white p-3 ring-1 ring-line"
          />
        )}
        <p className="mt-3 break-all text-center text-[13px] font-medium text-ink">{DEMO_URL}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-paper text-sm font-semibold text-ink"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo framing strip for /DemoHotel: tells a first-time viewer what they are
 * looking at, and hands them the link to show the next person.
 */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === "1") setHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (hidden) return null;

  return (
    <>
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <Info size={15} />
            </span>
            <p className="text-[13px] leading-5 text-ink">
              <strong className="font-bold">Live demo.</strong> This is what a guest sees after
              scanning the room QR at an AirPal Stay — Wi-Fi, menu, help, all without an app.
            </p>
            <button
              type="button"
              onClick={hide}
              aria-label="Dismiss demo notice"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex gap-2 pl-9">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand text-[13px] font-semibold text-white"
            >
              <QrCode size={15} /> Show someone
            </button>
            <Link
              href="/about"
              className="flex h-9 flex-1 items-center justify-center rounded-full border border-line bg-paper text-[13px] font-semibold text-ink"
            >
              What is AirPal?
            </Link>
          </div>
        </div>
      </div>
      <DemoShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
