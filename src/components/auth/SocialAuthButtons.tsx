import { useState } from "react";
import { toast } from "sonner";
import { authErrorCode, authErrorMessage } from "@shared/auth-email";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/native";
import type { SocialProvider } from "@/lib/social-auth";

import { useAuth } from "@/contexts/AuthContext";
import { BiometricAuthButton } from "./BiometricAuthButton";

// Social Login is disabled/hidden for now per user request
export const SHOW_SOCIAL_AUTH = false;

export function SocialAuthButtons({
  busy,
  onSocial,
  showBiometrics = true,
}: {
  busy?: boolean;
  onSocial: (provider: SocialProvider) => Promise<void>;
  showBiometrics?: boolean;
}) {
  const { hasEnrolledBiometrics } = useAuth();
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const locked = Boolean(busy || pending);

  async function go(provider: SocialProvider) {
    if (locked) return;
    setPending(provider);
    void triggerHaptic("light");
    try {
      await onSocial(provider);
    } catch (err) {
      // Record the Firebase code for diagnosis (no PII — code only). The
      // user-facing message stays generic on purpose.
      const code = authErrorCode(err);
      if (import.meta.env.DEV) console.error("[social-auth]", provider, code, err);
      void track("client_error", { errorClass: code || "unknown", errorSource: `${provider}-signin` });
      // invalid-credential means Apple/Firebase rejected the token — never
      // show password copy for it.
      const msg =
        provider === "apple" && authErrorCode(err) === "auth/invalid-credential"
          ? "Apple could not complete sign-in. Try again."
          : authErrorMessage(err, provider === "apple" ? "Apple sign-in failed" : "Google sign-in failed");
      toast.error(msg);
    } finally {
      setPending(null);
    }
  }

  // If social login is hidden and no biometrics enrolled, render nothing
  const showBio = showBiometrics && hasEnrolledBiometrics;
  if (!SHOW_SOCIAL_AUTH && !showBio) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showBio && <BiometricAuthButton variant="social" />}
      {SHOW_SOCIAL_AUTH && (
        <>
          <button
            type="button"
            disabled={locked}
            onClick={() => void go("google")}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold ring-1 ring-line transition hover:bg-paper active:scale-[0.99] disabled:opacity-60 shadow-2xs",
            )}
          >
            <GoogleMark />
            {pending === "google" ? "Continuing with Google…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => void go("apple")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 shadow-2xs"
          >
            <AppleMark />
            {pending === "apple" ? "Continuing with Apple…" : "Continue with Apple"}
          </button>
        </>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 36 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.4l6.1 5.2C38.4 37.4 44 31.5 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-1-3.1-.9c-1.6.1-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2-.1 1.6-.7 3.1-.7s1.8.7 3.1.7c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.6-3.7zM14.6 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 3 1 .1 2-.5 2.6-1.4z" />
    </svg>
  );
}

export function SocialAuthDivider() {
  if (!SHOW_SOCIAL_AUTH) return null;
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
