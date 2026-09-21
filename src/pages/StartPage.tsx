import { useEffect, useRef, useState, useMemo, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { isEmail } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { SignupFlow } from "@/components/auth/SignupFlow";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import { PhoneField } from "@/components/forms/PhoneField";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { phonePasswordNeedsSms, phoneReady } from "@shared/phone-auth";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";

import { liveBackendEnabled } from "@/lib/functions";
import { normalizeInviteCode, recordAppInvite, resolveInviter, stashInviteRef, takeInviteRef } from "@/lib/app-invites";
import { cn } from "@/lib/cn";

type AuthMode = "signin" | "signup" | "reset";
type AuthMethod = "email" | "phone";

type RoleHeroItem = {
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  title: string;
  desc: string;
  tint: string;
};

function RoleHero({
  kicker,
  title,
  sub,
  cta,
  items,
}: {
  kicker: string;
  title: ReactNode;
  sub: string;
  cta: string;
  items: RoleHeroItem[];
}) {
  return (
    <div className="mb-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{kicker}</p>
      <h1 className="font-display mt-2 text-3xl font-bold leading-tight">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-mute">{sub}</p>
      <div className="mt-4 space-y-2 text-left">
        {items.map((c) => (
          <div key={c.title} className="flex items-center gap-3 rounded-2xl ring-1 ring-line bg-card p-3">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", c.tint)}>
              <c.icon size={17} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{c.title}</span>
              <span className="block truncate text-xs text-mute">{c.desc}</span>
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => document.getElementById("auth-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="mt-3 text-xs font-semibold text-brand hover:underline"
      >
        {cta}
      </button>
    </div>
  );
}

export function StartPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const tabParam = params.get("tab");
  const refParam = params.get("ref") || "";
  const next = params.get("next") || "";
  const roleParam = params.get("role") || "";
  const emailParam = params.get("email") || "";
  const [, nav] = useLocation();

  const {
    login,
    loginWithPhonePassword,
    loginWithSocial,
    user,
    sendVerificationEmail,
    requestPasswordReset,
    logout,
  } = useAuth();
  const { mine, business } = useBio();
  const [pendingGo, setPendingGo] = useState(false);

  // Mode resolution
  const initialMode: AuthMode =
    tabParam === "reset"
      ? "reset"
      : tabParam === "signin"
        ? "signin"
        : tabParam === "signup" || tabParam === "email"
          ? "signup"
          : "signin";
  const initialMethod: AuthMethod = tabParam === "phone" ? "phone" : "email";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [method, setMethod] = useState<AuthMethod>(initialMethod);

  // Form inputs
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [phoneSignup, setPhoneSignup] = useState(false);
  const [phoneLoginMode, setPhoneLoginMode] = useState<"sms" | "password">("password");
  const [signInPhone, setSignInPhone] = useState("");
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const emailOk = isEmail(email);

  // Invite attribution: keep the inviter's code across the flow, show who
  // invited, and record the join once the account exists.
  const [inviterHandle, setInviterHandle] = useState<string | null>(null);
  const inviteRecorded = useRef(false);
  useEffect(() => {
    stashInviteRef(refParam);
    const code = normalizeInviteCode(refParam);
    if (!code) {
      setInviterHandle(null);
      return;
    }
    let alive = true;
    void resolveInviter(code).then((inviter) => {
      if (alive) setInviterHandle(inviter?.handle || null);
    });
    return () => {
      alive = false;
    };
  }, [refParam]);
  useEffect(() => {
    if (inviteRecorded.current || !user) return;
    const code = takeInviteRef();
    if (!code) return;
    inviteRecorded.current = true;
    void (async () => {
      const inviter = await resolveInviter(code);
      if (!inviter || inviter.uid === user.uid) return;
      await recordAppInvite({
        inviterUid: inviter.uid,
        inviterHandle: inviter.handle,
        inviteeUid: user.uid,
        inviteeLabel: user.displayName || "New member",
      });
    })();
  }, [user]);

  // Sync tab param when search changes
  useEffect(() => {
    if (tabParam === "reset") setMode("reset");
    else if (tabParam === "signup" || tabParam === "email") {
      setMode("signup");
      setMethod("email");
    } else if (tabParam === "phone") {
      setMethod("phone");
    } else if (tabParam === "signin") {
      setMode("signin");
    }
    if (emailParam && !email) setEmail(emailParam);
  }, [tabParam, emailParam]);

  // Guest-first front door: default context (no host/business/event/club
  // target) shows what AirPal is plus explore-first paths. Role contexts keep
  // their focused banners.
  const contextTarget = (roleParam || next).toLowerCase();
  const isGuestStart = !/host|business|place|event|club/.test(contextTarget);
  const isBusinessStart = /business|place/.test(contextTarget);
  const isHostStart = /host/.test(contextTarget) && !isBusinessStart;
  const isEventStart = /event/.test(contextTarget);
  const isClubStart = /club/.test(contextTarget);

  // Determine role context
  const roleContext = useMemo(() => {
    const target = (roleParam || next).toLowerCase();
    if (target.includes("host")) {
      return {
        icon: Building2,
        kicker: "Host Portal",
        title: "Sign in to Host Tools",
        signupTitle: "Create your Host Account",
        desc: "Manage your hotel, venue, hostel, or campus companion, digital keys, and Wi-Fi.",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
      };
    }
    if (target.includes("business") || target.includes("place")) {
      return {
        icon: Store,
        kicker: "Your place",
        title: "Sign in to add your place",
        signupTitle: "Add your place",
        desc: "Import from Google, publish offers, and show up when people nearby are making plans.",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
      };
    }
    if (target.includes("event")) {
      return {
        icon: CalendarDays,
        kicker: "Event Organiser",
        title: "Sign in to Event Manager",
        signupTitle: "Create Organiser Account",
        desc: "Set up weekend markets, street festivals, interactive stall directories, and gate QRs.",
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-500/10",
      };
    }
    if (target.includes("club")) {
      return {
        icon: Sparkles,
        kicker: "AirPal Club",
        title: "Sign in to AirPal Club",
        signupTitle: "Join AirPal Club",
        desc: "Unlock member invites, guest list perks, and save favourite stalls & events.",
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-500/10",
      };
    }
    return {
      icon: ShieldCheck,
      kicker: "AirPal.Me",
      title: "Welcome back",
      signupTitle: "Create your AirPal account",
      desc: "One login for your Circle, plans, stays, and a public @handle.",
      color: "text-brand",
      bg: "bg-brand/10",
    };
  }, [roleParam, next]);

  function afterInPath(): string {
    const dest = next.trim();
    if (dest.startsWith("/") && !dest.startsWith("//") && !dest.startsWith("/start")) return dest;
    if (roleParam === "host") return "/host";
    if (roleParam === "business" || business) return "/business";
    if (roleParam === "event") return "/event";
    if (isNativeApp()) return "/";
    return "/circle";
  }

  useEffect(() => {
    if (!user || phoneSignup) return;
    if (pendingGo || (next && !next.startsWith("/start"))) {
      setPendingGo(false);
      nav(afterInPath());
    }
  }, [user, pendingGo, next, nav, phoneSignup, roleParam, business]);

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setInlineError(null);
    const p = new URLSearchParams(search);
    p.set("tab", newMode === "signup" ? "signup" : newMode === "reset" ? "reset" : "signin");
    if (method === "phone") p.set("tab", "phone");
    nav(`/start?${p.toString()}`);
  }

  function switchMethod(newMethod: AuthMethod) {
    setMethod(newMethod);
    setInlineError(null);
    const p = new URLSearchParams(search);
    if (newMethod === "phone") p.set("tab", "phone");
    else p.set("tab", mode === "signup" ? "signup" : "signin");
    nav(`/start?${p.toString()}`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);

    // Reset Password mode
    if (mode === "reset") {
      if (!emailOk) {
        setInlineError({ message: "Please enter a valid email address." });
        return;
      }
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        setResetSent(true);
        toast.success("Password reset link sent to your email.");
      } catch (err) {
        const msg = authErrorMessage(err, "Could not send reset email. Please try again.");
        setInlineError({ message: msg });
        toast.error(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup") return;

    if (mode === "signin" && method === "phone" && phoneLoginMode === "password") {
      if (!phoneReady(signInPhone)) {
        setInlineError({ message: "Enter your mobile number with country code." });
        return;
      }
      if (!password) {
        setInlineError({ message: "Please enter your password." });
        return;
      }
    } else if (mode === "signin") {
      if (!emailOk) {
        setInlineError({ message: "Please enter a valid email address." });
        return;
      }
      if (!password) {
        setInlineError({ message: "Please enter your password." });
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin" && method === "phone" && phoneLoginMode === "password") {
        await loginWithPhonePassword(signInPhone, password);
        toast.success("Signed in successfully!");
        setPendingGo(true);
      } else {
        await login(email.trim(), password);
        toast.success("Signed in successfully!");
        setPendingGo(true);
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, "Sign in failed");

      if (!liveBackendEnabled()) {
        toast.message("Demo mode sign-in");
        setPendingGo(true);
      } else if (method === "phone" && phoneLoginMode === "password" && phonePasswordNeedsSms(err)) {
        setPhoneLoginMode("sms");
        setInlineError({ message: msg, code });
        toast.message(msg);
      } else {
        setInlineError({ message: msg, code });
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  // Already logged in view
  if (user && !phoneSignup && mode !== "signup") {
    const isHostUser = Boolean(user.propertyIds?.length || user.role === "host_admin" || user.role === "super_admin");
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm text-center">
          <div className="mx-auto flex justify-center">
            <MeAvatar faceClassName="h-16 w-16 text-xl" statusClass="h-4 w-4" />
          </div>
          <h1 className="font-display mt-4 text-2xl font-semibold">{user.displayName || "Your Account"}</h1>
          <p className="text-sm text-mute">{user.email || user.phone || "Signed in"}</p>
          {mine?.handle && (
            <span className="mt-2 inline-block rounded-full bg-brand/10 px-3 py-0.5 text-xs font-medium text-brand">
              @{mine.handle}
            </span>
          )}

          {next && (
            <div className="mt-5 rounded-2xl bg-amber-500/10 p-3 text-left ring-1 ring-amber-500/20">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">You're heading to:</p>
              <p className="truncate text-sm font-semibold text-ink">{next}</p>
              <Button size="sm" className="mt-2 w-full" onClick={() => nav(next)}>
                Continue to destination →
              </Button>
            </div>
          )}

          <div className="mt-6 text-left">
            <AccountContacts compact />
          </div>

          {user.email && user.emailVerified === false && (
            <div className="mt-4 text-left">
              <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
            </div>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold text-left">
              Quick Navigation
            </p>
            <Button className="w-full justify-between" onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}>
              <span>{mine ? `Edit profile (@${mine.handle})` : "Set up your public @handle"}</span>
              <User size={16} />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={() => nav("/host")}>
              <span>{isHostUser ? "Host Workspace (Hotel / Venue)" : "Become a Host · List Place"}</span>
              <Building2 size={16} />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={() => nav("/business")}>
              <span>{business ? `Local Business (@${business.handle})` : "List a Business · Deals"}</span>
              <Store size={16} />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={() => nav("/event")}>
              <span>Event Organiser Dashboard</span>
              <CalendarDays size={16} />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={() => nav("/me")}>
              <span>Your Saved Stays & Passes</span>
              <Sparkles size={16} />
            </Button>
          </div>

          <div className="mt-6 border-t border-line/70 pt-4">
            <button
              type="button"
              onClick={() => void logout().then(() => nav("/"))}
              className="text-xs text-mute hover:text-red-500 transition font-medium"
            >
              Sign out of this device
            </button>
          </div>
        </div>
      </div>
    );
  }

  const RoleIcon = roleContext.icon;

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
      {isGuestStart && (
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Life Made Easy</p>
          <h1 className="font-display mt-2 text-3xl font-bold leading-tight">
            Find a place. Make&nbsp;a&nbsp;plan. Meet&nbsp;your&nbsp;people.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
            Find places and experiences, make plans with family and friends, and use Stay concierge — in one account.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-left">
            {[
              {
                icon: MapPin,
                title: "Find places",
                desc: "Near you tonight",
                to: "/",
                tint: "bg-emerald-500/10 text-emerald-700",
              },
              {
                icon: CalendarDays,
                title: "Make plans",
                desc: "Family & friends",
                to: "/plan",
                tint: "bg-brand/10 text-brand",
              },
              {
                icon: Users,
                title: "Start Circle",
                desc: "People nearby",
                to: "/circle",
                tint: "bg-amber-500/10 text-amber-700",
              },
            ].map((c) => (
              <button
                key={c.to}
                type="button"
                onClick={() => nav(c.to)}
                className="rounded-2xl ring-1 ring-line bg-card p-3 transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className={cn("grid h-8 w-8 place-items-center rounded-xl", c.tint)}>
                  <c.icon size={16} strokeWidth={2.2} />
                </span>
                <span className="mt-2 block text-[13px] font-semibold leading-tight">{c.title}</span>
                <span className="block text-[11px] text-mute">{c.desc}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => nav("/")}
            className="mt-3 text-xs font-semibold text-brand hover:underline"
          >
            Browse first, join later →
          </button>
        </div>
      )}

      {isBusinessStart && (
        <RoleHero
          kicker="Your place"
          title={<>Add your place in one tap.</>}
          sub="Import your Google listing — logo, address, phone, website, hours — then confirm it's yours and go live."
          cta="Add your place below — it takes a minute ↓"
          items={[
            {
              icon: Store,
              title: "Import from Google",
              desc: "Logo, location, contacts, website",
              tint: "bg-emerald-500/10 text-emerald-700",
            },
            {
              icon: BadgePercent,
              title: "Publish offers",
              desc: "Deals guests show at the till",
              tint: "bg-brand/10 text-brand",
            },
            {
              icon: QrCode,
              title: "QR for your counter",
              desc: "Guests scan and find you",
              tint: "bg-amber-500/10 text-amber-700",
            },
          ]}
        />
      )}
      {isHostStart && (
        <RoleHero
          kicker="For hosts"
          title={<>Hosting changes everything.</>}
          sub="List your rooms, approve every guest yourself, and get discovered by travellers staying nearby — you stay in control."
          cta="List your space below — it takes a minute ↓"
          items={[
            {
              icon: BedDouble,
              title: "List your rooms",
              desc: "Rooms, bunks & crash pads",
              tint: "bg-emerald-500/10 text-emerald-700",
            },
            {
              icon: ShieldCheck,
              title: "Approve every guest",
              desc: "Manual approval, your rules",
              tint: "bg-brand/10 text-brand",
            },
            {
              icon: MapPin,
              title: "Get discovered",
              desc: "Show up in nearby stays",
              tint: "bg-amber-500/10 text-amber-700",
            },
          ]}
        />
      )}
      {isEventStart && (
        <RoleHero
          kicker="For organisers"
          title={<>Fill every seat.</>}
          sub="Publish your event, sell stalls to local vendors, and track RSVPs in one place — free to list."
          cta="Publish your event below — it takes a minute ↓"
          items={[
            {
              icon: Megaphone,
              title: "Publish your event",
              desc: "Your page on AirPal.Me",
              tint: "bg-emerald-500/10 text-emerald-700",
            },
            { icon: Store, title: "Sell stalls", desc: "Vendors book & pay online", tint: "bg-brand/10 text-brand" },
            { icon: Users, title: "Track RSVPs", desc: "Know who's coming", tint: "bg-amber-500/10 text-amber-700" },
          ]}
        />
      )}
      {isClubStart && (
        <RoleHero
          kicker="For clubs & circles"
          title={<>Run your circle, minus the admin.</>}
          sub="Plan outings together, vote on stops, and keep everyone in the loop — free to start."
          cta="Start your circle below — it takes a minute ↓"
          items={[
            {
              icon: CalendarDays,
              title: "Plan together",
              desc: "Propose dates & places",
              tint: "bg-emerald-500/10 text-emerald-700",
            },
            { icon: Users, title: "Vote on stops", desc: "Everyone gets a say", tint: "bg-brand/10 text-brand" },
            {
              icon: Ticket,
              title: "Keep everyone posted",
              desc: "One page for the whole crew",
              tint: "bg-amber-500/10 text-amber-700",
            },
          ]}
        />
      )}

      {/* Context Role Banner */}
      <div className="mb-6 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
        <div className="flex items-center gap-3">
          <span
            className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", roleContext.bg, roleContext.color)}
          >
            <RoleIcon size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", roleContext.color)}>
              {roleContext.kicker}
            </p>
            <h1 className="font-display text-lg font-semibold leading-tight text-ink">
              {mode === "reset"
                ? "Reset your password"
                : mode === "signup"
                  ? roleContext.signupTitle
                  : roleContext.title}
            </h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-mute leading-relaxed">{roleContext.desc}</p>
      </div>

      {mode === "signup" && inviterHandle && (
        <p className="mb-4 rounded-2xl ring-1 ring-line bg-card px-4 py-3 text-center text-sm">
          You’re invited by <span className="font-semibold text-brand">@{inviterHandle}</span>
        </p>
      )}

      {/* Main Card */}
      <div id="auth-card" className="rounded-3xl ring-1 ring-line/70 bg-card/95 backdrop-blur-md p-6 shadow-sm border border-line/40 scroll-mt-4">
        {mode === "reset" ? (
          /* Password Reset Flow */
          <div>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>

            <h2 className="font-display text-xl font-semibold">Forgot your password?</h2>
            <p className="mt-1 text-xs text-mute">
              Enter your registered email. We’ll send you a secure link to choose a new password.
            </p>

            {inlineError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{inlineError.message}</span>
              </div>
            )}

            {resetSent ? (
              <div className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-center ring-1 ring-emerald-500/20">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-ink">Reset link sent!</p>
                <p className="mt-1 text-xs text-mute">
                  Check your inbox for <span className="font-medium text-ink">{email}</span>. Please also check your
                  spam folder.
                </p>
                <Button size="sm" variant="ghost" className="mt-4" onClick={() => switchMode("signin")}>
                  Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <ValidField label="Email Address" ok={emailOk}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                      className={cn(fieldInput, "pl-10")}
                    />
                  </div>
                </ValidField>

                <Button type="submit" className="w-full" disabled={busy || !emailOk} loading={busy}>
                  {busy ? "Sending link…" : "Email reset link"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          /* Normal Sign In / Sign Up Flow */
          <div>
            {/* Primary Mode Segmented Control: Sign In vs Create Account */}
            <div className="relative flex rounded-full bg-paper p-1 ring-1 ring-line">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={cn(
                  "flex-1 rounded-full py-2 text-center text-xs font-semibold transition",
                  mode === "signin" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={cn(
                  "flex-1 rounded-full py-2 text-center text-xs font-semibold transition",
                  mode === "signup" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Create Account
              </button>
            </div>

            {mode === "signin" && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => switchMethod("email")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition",
                    method === "email" ? "bg-brand/10 text-brand ring-1 ring-brand/30" : "text-mute hover:text-ink",
                  )}
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>
                <span className="text-xs text-line">|</span>
                <button
                  type="button"
                  onClick={() => switchMethod("phone")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition",
                    method === "phone" ? "bg-brand/10 text-brand ring-1 ring-brand/30" : "text-mute hover:text-ink",
                  )}
                >
                  <Phone size={13} />
                  <span>Mobile</span>
                </button>
              </div>
            )}

            {/* Inline Actionable Error Banner */}
            {inlineError && (
              <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{inlineError.message}</p>
                    {inlineError.code === "auth/email-already-in-use" && (
                      <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className="mt-1 font-semibold text-brand underline block"
                      >
                        Sign in with this email instead →
                      </button>
                    )}
                    {(inlineError.code === "auth/wrong-password" || inlineError.code === "auth/invalid-credential") && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="mt-1 font-semibold text-brand underline block"
                      >
                        Forgot your password? Reset it here →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5">
              <SocialAuthButtons
                busy={busy}
                onSocial={async (provider) => {
                  setInlineError(null);
                  await loginWithSocial(provider);
                  toast.success("Signed in successfully!");
                  setPendingGo(true);
                }}
              />
              <SocialAuthDivider />
            </div>

            {mode === "signup" ? (
              <div className="mt-1">
                <SignupFlow
                  onDone={() => {
                    setPhoneSignup(false);
                    setPendingGo(true);
                  }}
                />
              </div>
            ) : method === "phone" ? (
              <div className="mt-4">
                <div className="mb-3 flex justify-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line">
                  <button
                    type="button"
                    onClick={() => setPhoneLoginMode("password")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      phoneLoginMode === "password" ? "bg-brand text-white" : "text-mute",
                    )}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneLoginMode("sms")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      phoneLoginMode === "sms" ? "bg-brand text-white" : "text-mute",
                    )}
                  >
                    SMS code
                  </button>
                </div>
                {phoneLoginMode === "sms" ? (
                  <PhoneLogin
                    onBegin={() => setPhoneSignup(true)}
                    onDone={() => {
                      setPhoneSignup(false);
                      setPendingGo(true);
                    }}
                    onNeedAccount={() => {
                      setPhoneSignup(true);
                      switchMode("signup");
                    }}
                  />
                ) : (
                  <form onSubmit={onSubmit} className="space-y-3.5">
                    <ValidField label="Mobile number" ok={phoneReady(signInPhone)}>
                      <PhoneField value={signInPhone} onChange={setSignInPhone} />
                    </ValidField>
                    <ValidField label="Password" ok={Boolean(password)}>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className={cn(fieldInput, "pl-10 pr-10")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </ValidField>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={busy} loading={busy}>
                      {busy ? "Signing in…" : "Sign in"}
                    </Button>
                    <p className="text-center text-[12px] text-mute">
                      SMS code always works if phone + password isn&apos;t set up yet.
                    </p>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
                <ValidField label="Email Address" ok={emailOk} error={email && !emailOk ? "Enter a valid email" : null}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={cn(fieldInput, "pl-10")}
                      autoFocus
                    />
                  </div>
                </ValidField>
                <ValidField label="Password" ok={Boolean(password)} error={null}>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={cn(fieldInput, "pl-10 pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </ValidField>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={busy} loading={busy}>
                  {busy ? "Signing in…" : "Sign In"}
                </Button>

                {/* Social Sign In Options */}
                <div className="mt-5">
                  <div className="relative flex items-center justify-center my-3">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line/60" /></div>
                    <span className="relative bg-card px-3 text-[11px] font-medium text-mute uppercase tracking-wider">or continue with</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        toast.info("Google Sign-In ready for launch");
                      }}
                      className="flex items-center justify-center gap-2 h-10 px-3 rounded-2xl bg-card border border-line hover:bg-paper text-xs font-medium text-ink transition active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        toast.info("Apple Sign-In ready for launch");
                      }}
                      className="flex items-center justify-center gap-2 h-10 px-3 rounded-2xl bg-card border border-line hover:bg-paper text-xs font-medium text-ink transition active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 fill-current text-ink" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97.02c.11.13.23.28.34.44.75 1.02.73 2.25.7 2.37-1.05.08-2.31-.58-2.99-1.37-.12-.14-.24-.31-.34-.48-.71-1.05-.67-2.22-.67-2.26 1.15.02 2.3.67 2.96 1.3z"/>
                      </svg>
                      <span>Apple</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Quick Switch Helper */}
            <div className="mt-5 border-t border-line/70 pt-4 text-center">
              {mode === "signin" ? (
                <p className="text-xs text-mute">
                  New to AirPal?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-brand hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-mute">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-semibold text-brand hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Trust & Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-mute/80">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
              <span>Protected by AirPal Trust & Safety • Encrypted</span>
            </div>
          </div>
        )}
      </div>

      {/* Role Portal Quick Links */}
      <div className="mt-6 text-center">
        <p className="text-xs text-mute">
          Explore partner options:{" "}
          <Link href="/join" className="text-brand font-medium hover:underline">
            Become a Host, Business or Organiser
          </Link>
        </p>
        <p className="mt-2 text-[11px] text-mute/80">
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
