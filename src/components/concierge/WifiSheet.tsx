import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/native";

export function WifiSheet({
  open,
  onClose,
  wifi,
}: {
  open: boolean;
  onClose: () => void;
  wifi: { network?: string; password?: string; speed?: string };
}) {
  const { t } = useLocale();

  return (
    <Sheet open={open} onClose={onClose} title={t("wifi")}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Network Name</p>
      <p className="font-display text-2xl font-bold text-ink">{wifi.network || "Ask the desk"}</p>
      {wifi.speed ? <p className="mt-1 text-xs font-medium text-mute">{wifi.speed}</p> : null}
      {wifi.password ? (
        <>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-mute">Password</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink">{wifi.password}</p>
          <Button
            className="mt-5 w-full font-bold shadow-xs"
            onClick={() => {
              void (async () => {
                try {
                  await navigator.clipboard.writeText(wifi.password || "");
                  void triggerHaptic("success");
                  toast.success(t("copied"));
                } catch {
                  toast.error("Copy failed — long-press the password to copy it manually.");
                }
              })();
            }}
          >
            Copy Password
          </Button>
        </>
      ) : (
        <p className="mt-4 text-xs text-mute">
          Scan the room or lobby QR code for the live password, or ask front desk.
        </p>
      )}
    </Sheet>
  );
}
