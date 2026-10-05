import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScrollLock } from "@/hooks/useScrollLock";

export function PrintStandeeModal({
  qrUrl,
  businessName,
  title,
  onClose,
}: {
  qrUrl: string;
  businessName: string;
  title: string;
  onClose: () => void;
}) {
  useScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Print standee preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 text-center text-zinc-900 shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close print preview"
            className="grid h-11 w-11 place-items-center rounded-full text-zinc-400 hover:text-zinc-800"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand">AirPal Pulse</span>
          <h3 className="font-display text-2xl font-extrabold tracking-tight">{businessName}</h3>
          <p className="mx-auto max-w-xs text-xs font-medium text-zinc-600">{title}</p>
        </div>

        <div className="inline-block rounded-2xl bg-zinc-50 p-4 shadow-inner ring-1 ring-zinc-200">
          <img
            src={qrUrl}
            alt="Pulse QR code for printing"
            width={176}
            height={176}
            className="mx-auto h-44 w-44 rounded-lg"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-800">Scan with Phone Camera</p>
          <p className="text-[11px] text-zinc-500">Zero Apps · Takes 5 Seconds</p>
        </div>

        <Button className="w-full" onClick={() => window.print()}>
          <Printer size={15} aria-hidden /> Print Standee
        </Button>
      </div>
    </div>,
    document.body,
  );
}
