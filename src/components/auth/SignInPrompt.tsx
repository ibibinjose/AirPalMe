import { useEffect } from "react";
import { useLocation } from "wouter";
import { LogIn, UserPlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";

function currentNext(): string {
  try {
    const path = window.location.pathname + window.location.search;
    return path.startsWith("/start") ? "/" : path;
  } catch {
    return "/";
  }
}

/**
 * Global guest nudge. Gated actions (like, follow, RSVP) open this instead of
 * failing silently; the pending intent resumes after sign-in.
 */
export function SignInPrompt() {
  const { signInPrompt, dismissSignInPrompt, loginWithSocial } = useAuth();
  const [, nav] = useLocation();

  useScrollLock(Boolean(signInPrompt));

  useEffect(() => {
    if (!signInPrompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissSignInPrompt();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [signInPrompt, dismissSignInPrompt]);

  if (!signInPrompt) return null;

  const next = encodeURIComponent(currentNext());
  const go = (tab: "signin" | "signup") => {
    dismissSignInPrompt();
    nav(`/start?tab=${tab}&next=${next}`);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={dismissSignInPrompt}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in required"
    >
      <div
        className="modal-safe w-full max-w-sm rounded-[28px] bg-paper p-6 text-center shadow-2xl ring-1 ring-line motion-safe:animate-[sheet-up_0.22s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          <LogIn size={22} />
        </div>
        <h2 className="font-display mt-3 text-xl font-bold">Sign in to continue</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-mute">{signInPrompt.reason}</p>
        <p className="mt-1 text-xs text-mute">Free account · syncs likes, follows and plans everywhere.</p>
        <div className="mt-5 space-y-2">
          <SocialAuthButtons
            onSocial={async (provider) => {
              await loginWithSocial(provider);
              dismissSignInPrompt();
            }}
          />
          <SocialAuthDivider />
          <button
            type="button"
            onClick={() => go("signin")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-[0.99]"
          >
            <LogIn size={16} />
            Sign in with email or phone
          </button>
          <button
            type="button"
            onClick={() => go("signup")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold ring-1 ring-line transition hover:bg-card/80 active:scale-[0.99]"
          >
            <UserPlus size={16} />
            Create free account
          </button>
          <button
            type="button"
            onClick={dismissSignInPrompt}
            className="inline-flex h-9 items-center gap-1 px-3 text-xs font-medium text-mute transition hover:text-ink"
          >
            <X size={13} />
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
