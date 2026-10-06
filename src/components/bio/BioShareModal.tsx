import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, Download, Share2, X, QrCode } from "lucide-react";
import { toast } from "sonner";
import { makeQrDataUrl } from "@/lib/qr";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/Button";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";

type BioShareModalProps = {
  open: boolean;
  onClose: () => void;
  handle: string;
  name: string;
  url: string;
};

export function BioShareModal({ open, onClose, handle, name, url }: BioShareModalProps) {
  useScrollLock(open);

  const [qrData, setQrData] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void makeQrDataUrl(url, 360).then((data) => {
      if (live) setQrData(data);
    });
    return () => {
      live = false;
    };
  }, [open, url]);

  if (!open || typeof document === "undefined") return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(url);
    }
  }

  function handleDownload() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `airpal-${handle}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code downloaded for print & counters");
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} (@${handle})`,
          text: `Check out ${name} on AirPal`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void handleCopy();
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Profile"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="modal-safe relative w-full max-w-sm rounded-[32px] bg-paper p-6 text-center shadow-2xl ring-1 ring-line animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute transition hover:bg-black/5 hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          <QrCode size={14} />
          <span>Share Profile</span>
        </div>
        <h2 className="font-display mt-1 text-2xl font-bold">@{handle}</h2>
        <p className="mt-0.5 text-xs text-mute truncate">{name}</p>

        <div className="mx-auto mt-5 flex h-60 w-60 items-center justify-center rounded-2xl bg-white p-3 shadow-inner ring-1 ring-black/5">
          {qrData ? (
            <img src={qrData} alt={`QR Code for @${handle}`} className="h-full w-full object-contain" />
          ) : (
            <div className="text-xs text-mute animate-pulse">Generating QR…</div>
          )}
        </div>

        <p className="mt-3 font-mono text-[13px] text-mute">{url.replace(/^https?:\/\//, "")}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5" disabled={!qrData}>
            <Download size={15} />
            Download
          </Button>
        </div>

        <AppleWalletButton
          className="mt-3 w-full justify-center"
          onClick={() => {
            const passUrl = businessCardWalletPassUrl(handle);
            void openAppleWalletPass(passUrl, "@" + handle + "-AirPal-BusinessCard");
          }}
        />
        <GoogleWalletButton
          className="mt-2 w-full justify-center"
          onClick={() => {
            void openGoogleWalletPass(googleWalletCardUrl(handle));
          }}
        />

        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button size="sm" onClick={handleNativeShare} className="mt-2 w-full gap-1.5 bg-brand text-white">
            <Share2 size={15} />
            Share via…
          </Button>
        )}

        <button type="button" onClick={onClose} className="mt-4 text-xs font-medium text-mute hover:text-ink">
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
