import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Calendar,
  Compass,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCheck,
} from "lucide-react";
import { BRAND_TAGLINE, ECOSYSTEM } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export function NativeOpenScreen() {
  const { loginWithSocial, authReady } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);
  const isPass = isPassApp();

  const currentProduct = isPass ? ECOSYSTEM.pass : ECOSYSTEM.me;

  const highlights = isPass
    ? [
        {
          icon: Ticket,
          title: "Events, Concerts & Culture",
          desc: "Discover festivals, club nights, and cultural events near you.",
          tint: "bg-blue-500/10 text-brand",
        },
        {
          icon: QrCode,
          title: "Wallet & Instant Access",
          desc: "Fast QR tickets, door scanner, and Apple & Google Wallet passes.",
          tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          icon: Compass,
          title: "Perks & Exclusive Deals",
          desc: "Verified partner perks, secret dining discounts, and VIP entry.",
          tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
      ]
    : [
        {
          icon: Calendar,
          title: "Day Flow & Outfits",
          desc: "Real-time weather forecast, smart outfit engine, and today's schedule.",
          tint: "bg-blue-500/10 text-brand",
        },
        {
          icon: Sparkles,
          title: "Plans & Social Circles",
          desc: "Effortless group hangouts, shared itineraries, and shared memories.",
          tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        },
        {
          icon: UserCheck,
          title: "Universal Bio & Identity",
          desc: "Your verified @handle, active tickets, and seamless RSVP.",
          tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
      ];

  return (
    <div
      data-testid="native-open-screen"
      className="flex min-h-dvh flex-col bg-paper px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]"
    >
      {/* Top Brand Hero */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-4">
          <div className="absolute -inset-2 rounded-[28px] bg-brand/10 blur-xl dark:bg-brand/20" />
          <img
            src="/logo-mark.png"
            alt="AirPal"
            className="relative h-20 w-20 rounded-[22px] bg-white object-contain p-2 shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
          />
        </div>

        <h1 className="font-display text-[2.25rem] font-bold leading-tight tracking-tight text-ink">
          AirPal{isPass ? <span className="text-accent"> Pass</span> : <span className="text-accent">.me</span>}
        </h1>

        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {BRAND_TAGLINE}
        </p>

        <p className="mt-2 max-w-xs text-[14px] font-medium leading-relaxed text-ink/80">
          {currentProduct.coreJob}
        </p>

        {/* Product feature cards */}
        <div className="mt-6 w-full max-w-sm space-y-2.5 text-left">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line/80 shadow-2xs transition hover:ring-line"
            >
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", item.tint)}>
                <item.icon size={19} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink leading-snug">{item.title}</p>
                <p className="text-[11px] text-mute leading-tight truncate">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Universal ecosystem assurance */}
        <div className="mt-4 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-mute ring-1 ring-line/60">
          <ShieldCheck size={13} className="text-accent shrink-0" />
          <span>One account for both AirPal Me & AirPal Pass</span>
        </div>
      </div>

      {/* Action Sheet / CTAs */}
      <div className="mx-auto w-full max-w-sm space-y-2.5 pt-4">
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
              className="w-full h-12 text-sm font-semibold shadow-xs"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("light");
                nav("/start?tab=signup");
              }}
            >
              Create a free account
            </Button>

            <Button
              variant="ghost"
              className="w-full h-12 text-sm font-semibold"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("light");
                nav("/start?tab=signin");
              }}
            >
              <Mail size={16} />
              Sign in with email or phone
            </Button>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/about");
                }}
                className="text-xs font-semibold text-mute hover:text-ink transition"
              >
                Learn more about {isPass ? "AirPal Pass" : "AirPal"}
              </button>
            </div>
          </>
        )}

        {/* Legal Footer */}
        <p className="pt-2 text-center text-[11px] leading-relaxed text-mute">
          By continuing you agree to AirPal{" "}
          <button
            type="button"
            className="font-semibold text-ink underline"
            onClick={() => nav("/terms")}
          >
            Terms
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="font-semibold text-ink underline"
            onClick={() => nav("/privacy")}
          >
            Privacy
          </button>
          . Accounts are for people 18+.
        </p>
      </div>
    </div>
  );
}
