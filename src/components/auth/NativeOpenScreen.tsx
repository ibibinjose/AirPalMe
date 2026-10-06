import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";
import { triggerHaptic } from "@/lib/native";

export function NativeOpenScreen() {
  const { loginWithSocial, authReady } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);

  return (
    <div
      data-testid="native-open-screen"
      className="flex min-h-dvh flex-col bg-paper px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src="/logo-mark.png"
          alt=""
          className="h-20 w-20 rounded-[22px] bg-white object-contain p-2 shadow-md ring-1 ring-black/5"
        />
        <h1 className="font-display mt-5 text-[2.15rem] font-bold leading-none tracking-tight text-ink">
          AirPal<span className="text-accent">.me</span>
        </h1>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{BRAND_TAGLINE}</p>
        <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-mute">
          Find a place. Make a plan. Meet your people — {BRAND.publicPositioning}
        </p>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-3 pb-2">
        {!authReady ? (
          <p className="py-6 text-center text-sm text-mute" role="status">
            Opening AirPal…
          </p>
        ) : (
          <>
            <SocialAuthButtons
              busy={busy}
              onSocial={async (provider) => {
                setBusy(true);
                try {
                  await loginWithSocial(provider);
                  toast.success("Signed in");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("light");
                nav("/start?tab=signin");
              }}
            >
              <Mail size={16} />
              Sign in with email or phone
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("light");
                nav("/start?tab=signup");
              }}
              className="w-full py-2 text-sm font-semibold text-accent"
            >
              Create a free account
            </button>
          </>
        )}
        <p className="pt-1 text-center text-[11px] leading-relaxed text-mute">
          By continuing you agree to AirPal{" "}
          <button type="button" className="font-semibold text-ink underline" onClick={() => nav("/terms")}>
            Terms
          </button>{" "}
          and{" "}
          <button type="button" className="font-semibold text-ink underline" onClick={() => nav("/privacy")}>
            Privacy
          </button>
          . Accounts are for people 18+.
        </p>
      </div>
    </div>
  );
}
