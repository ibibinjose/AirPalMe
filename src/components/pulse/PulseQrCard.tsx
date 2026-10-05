import { Copy, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PulseQrCard({
  qrUrl,
  publicUrl,
  onCopyLink,
  onPrint,
}: {
  qrUrl: string;
  publicUrl: string;
  onCopyLink: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[28px] bg-emerald-500/10 p-5 ring-1 ring-emerald-500/30">
      <div className="flex items-center gap-3.5">
        <img
          src={qrUrl}
          alt="Pulse QR code"
          width={80}
          height={80}
          loading="lazy"
          className="h-20 w-20 rounded-xl bg-white p-1.5 shadow-2xs ring-1 ring-line"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Live QR Ready for Print & Placement
          </div>
          <div className="truncate font-mono text-[11px] text-mute">{publicUrl}</div>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <Button size="sm" variant="ghost" onClick={onCopyLink}>
              <Copy size={13} aria-hidden /> Copy Link
            </Button>
            <Button size="sm" onClick={onPrint}>
              <Printer size={13} aria-hidden /> Print Standee
            </Button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-brand hover:underline"
            >
              Test View <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
