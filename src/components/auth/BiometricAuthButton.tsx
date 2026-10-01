import { useState } from "react";
import { toast } from "sonner";
import { Fingerprint, KeyRound, ScanFace } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import type { BiometricType } from "@/lib/biometrics";

function BiometricIcon({ type, size = 18 }: { type: BiometricType; size?: number }) {
  if (type === "face_id") {
    return <ScanFace size={size} className="shrink-0 text-brand" strokeWidth={2.2} />;
  }
  if (type === "touch_id" || type === "fingerprint") {
    return <Fingerprint size={size} className="shrink-0 text-brand" strokeWidth={2.2} />;
  }
  return <KeyRound size={size} className="shrink-0 text-brand" strokeWidth={2.2} />;
}

export function BiometricAuthButton({
  className,
  onSuccess,
  variant = "hero",
}: {
  className?: string;
  onSuccess?: () => void;
  variant?: "hero" | "compact" | "social";
}) {
  const { loginWithBiometrics, biometricLabel, biometricType } = useAuth();
  const [scanning, setScanning] = useState(false);

  async function handleBiometricAuth() {
    if (scanning) return;
    setScanning(true);
    void triggerHaptic("medium");
    try {
      await loginWithBiometrics();
      void triggerHaptic("heavy");
      toast.success(`${biometricLabel} verified! Welcome back.`);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Biometric authentication cancelled or failed";
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg);
      }
    } finally {
      setScanning(false);
    }
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={() => void handleBiometricAuth()}
        disabled={scanning}
        className={cn(
          "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-brand/10 p-3.5 text-ink ring-1 ring-brand/30 transition-all hover:bg-brand/15 hover:ring-brand/50 active:scale-[0.99] disabled:opacity-60 shadow-xs",
          className,
        )}
      >
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-md transition-transform group-hover:scale-105",
            scanning && "animate-pulse ring-4 ring-brand/30",
          )}
        >
          {biometricType === "face_id" ? (
            <ScanFace size={22} strokeWidth={2.2} />
          ) : biometricType === "touch_id" || biometricType === "fingerprint" ? (
            <Fingerprint size={22} strokeWidth={2.2} />
          ) : (
            <KeyRound size={22} strokeWidth={2.2} />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-ink">
            {scanning ? `Scanning ${biometricLabel}…` : `1-Tap ${biometricLabel} Sign In`}
          </span>
          <span className="block text-[11px] text-mute">Instant unlock saved for this device</span>
        </span>
        <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
          Fast
        </span>
      </button>
    );
  }

  if (variant === "social") {
    return (
      <button
        type="button"
        disabled={scanning}
        onClick={() => void handleBiometricAuth()}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-card text-sm font-semibold text-ink ring-1 ring-brand/40 transition hover:bg-paper hover:ring-brand active:scale-[0.99] disabled:opacity-60 shadow-2xs",
          className,
        )}
      >
        <BiometricIcon type={biometricType} size={18} />
        <span>{scanning ? `Verifying ${biometricLabel}…` : `Continue with ${biometricLabel}`}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={scanning}
      onClick={() => void handleBiometricAuth()}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand ring-1 ring-brand/30 transition hover:bg-brand/15 active:scale-95",
        className,
      )}
    >
      <BiometricIcon type={biometricType} size={14} />
      <span>{scanning ? "Scanning…" : biometricLabel}</span>
    </button>
  );
}
