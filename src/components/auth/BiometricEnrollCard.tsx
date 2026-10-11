import { useState } from "react";
import { toast } from "sonner";
import { Check, Fingerprint, KeyRound, ScanFace, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export function BiometricEnrollCard({ compact = false, onEnrolled }: { compact?: boolean; onEnrolled?: () => void }) {
  const {
    user,
    hasEnrolledBiometrics,
    biometricsSupported,
    biometricLabel,
    biometricType,
    enrollUserBiometrics,
    removeUserBiometrics,
    loginWithBiometrics,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!biometricsSupported && !hasEnrolledBiometrics) {
    return null;
  }

  async function handleEnroll() {
    setBusy(true);
    void triggerHaptic("medium");
    try {
      await enrollUserBiometrics();
      void triggerHaptic("heavy");
      toast.success(`${biometricLabel} is now enabled for 1-tap sign in on this device!`);
      onEnrolled?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register biometrics";
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTestScan() {
    setTesting(true);
    void triggerHaptic("light");
    try {
      await loginWithBiometrics();
      void triggerHaptic("heavy");
      toast.success(`${biometricLabel} scan verified successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test scan failed";
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg);
      }
    } finally {
      setTesting(false);
    }
  }

  function handleRemove() {
    if (!window.confirm(`Disable ${biometricLabel} sign-in on this device?`)) return;
    removeUserBiometrics();
    toast.success(`${biometricLabel} removed from this device.`);
  }

  const Icon =
    biometricType === "face_id"
      ? ScanFace
      : biometricType === "touch_id" || biometricType === "fingerprint"
        ? Fingerprint
        : KeyRound;

  return (
    <div className={cn("rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs", compact ? "mt-3" : "mt-4")}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent ring-1 ring-brand/20">
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ink">{biometricLabel}</p>
            {hasEnrolledBiometrics && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                <Check size={10} strokeWidth={3} /> Active
              </span>
            )}
          </div>
          <p className="text-xs text-mute">
            {hasEnrolledBiometrics
              ? `Use ${biometricLabel} for instant sign-in without passwords`
              : `Enable 1-tap ${biometricLabel} sign-in on this device`}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {hasEnrolledBiometrics ? (
          <>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => void handleTestScan()}
              disabled={testing}
              loading={testing}
              className="rounded-xl text-xs font-semibold"
            >
              Test {biometricLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 size={13} className="mr-1" />
              Remove
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => void handleEnroll()}
            disabled={busy || !user}
            loading={busy}
            className="w-full rounded-xl text-xs font-bold"
          >
            Enable {biometricLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
