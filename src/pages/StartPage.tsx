import { useEffect, useRef, useState, useMemo, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  Building2,
  CalendarDays,
  Check,
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
import { normalizeHandle } from "@shared/bio";
import { isEmail, passwordIssues } from "@shared/validate";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { SignupFlow } from "@/components/auth/SignupFlow";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import { PhoneField } from "@/components/forms/PhoneField";
import { isNativeApp, triggerHapticSelection } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { phonePasswordNeedsSms, phoneReady } from "@shared/phone-auth";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { BiometricAuthButton } from "@/components/auth/BiometricAuthButton";
import { BiometricEnrollCard } from "@/components/auth/BiometricEnrollCard";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";

import { liveBackendEnabled } from "@/lib/functions";
import { normalizeInviteCode, recordAppInvite, resolveInviter, stashInviteRef, takeInviteRef } from "@/lib/app-invites";
import { cn } from "@/lib/cn";

type AuthMode = "signin" | "signup" | "reset";
type AuthMethod = "email" | "phone";

/**
 * Keyboard hygiene: 16px stops iOS auto-zoom, focusing a field pulls it
 * above the keyboard on web + Android webviews.
 */
const KEYBOARD_SAFE_INPUT = "text-[16px]";
function nudgeIntoView(e: React.FocusEvent<HTMLElement>) {
  try {
    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    /* ignore */
  }
}

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{kicker}</p>
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
        className="mt-3 inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-accent hover:underline"
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
    register,
    loginWithPhonePassword,
    loginWithSocial,
    user,
    sendVerificationEmail,
    requestPasswordReset,
    logout,
    hasEnrolledBiometrics,
  } = useAuth();
  const { mine, business, biosReady, createProfile } = useBio();
  const { keyboardHeight } = useVirtualKeyboard();
  const [pendingGo, setPendingGo] = useState(false);

  const LAST_EMAIL_KEY = "airpal.last_signin_email";

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
  const [email, setEmail] = useState(
    () => emailParam || (typeof window !== "undefined" ? localStorage.getItem(LAST_EMAIL_KEY) || "" : ""),
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email Signup Specific inputs
  const [signupName, setSignupName] = useState("");
  const [signupHandle, setSignupHandle] = useState("");
  const [handleManual, setHandleManual] = useState(false);
  const [signupAdultConfirmed, setSignupAdultConfirmed] = useState(true);
  const handleStatus = useHandleStatus(signupHandle);
  const handleOk = handleStatus.ok;

  // UI state
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [phoneSignup, setPhoneSignup] = useState(false);
  const [phoneLoginMode, setPhoneLoginMode] = useState<"sms" | "password">("password");
  const [signInPhone, setSignInPhone] = useState("");
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const emailOk = isEmail(email);
  const passOk = passwordIssues(password).length === 0;

  const passwordStrength = useMemo(() => {
    if (!password) return { label: "", score: 0, color: "bg-line" };
    if (password.length < 6) return { label: "Too short", score: 1, color: "bg-red-500" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    else if (/[a-zA-Z]/.test(password)) score += 0.5;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1.5) return { label: "Weak", score: 1, color: "bg-red-500" };
    if (score <= 2.5) return { label: "Fair", score: 2, color: "bg-amber-500" };
    if (score <= 3.5) return { label: "Good", score: 3, color: "bg-blue-500" };
    return { label: "Strong", score: 4, color: "bg-emerald-500" };
  }, [password]);

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
        title: "Sign in to Host Console",
        signupTitle: "Create your Host Account",
        desc: "Manage your PBSA building cohort, 60s Arrival Engine, Belonging Reports, and resident support.",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
      };
    }
    if (target.includes("business") || target.includes("place")) {
      return {
        icon: Store,
        kicker: "Partner account",
        title: "Sign in — same AirPal login",
        signupTitle: "Open a partner account",
        desc: "Same login as your AirPal Me account. Add the place, then guests find it on What's on and in search.",
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
        color: "text-accent",
        bg: "bg-brand/10",
      };
    }
    return {
      icon: ShieldCheck,
      kicker: "AirPal.Me",
      title: "Welcome back",
      signupTitle: "Create your AirPal account",
      desc: "One universal login for your digital bio, Circle, hangout plans, and event passes.",
      color: "text-accent",
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
    return "/now";
  }

  useEffect(() => {
    if (!user || phoneSignup) return;
    if (pendingGo || (next && !next.startsWith("/start"))) {
      setPendingGo(false);
      nav(afterInPath());
    }
  }, [user, pendingGo, next, nav, phoneSignup, roleParam, business]);

  function switchMode(newMode: AuthMode) {
    void triggerHapticSelection();
    setMode(newMode);
    setInlineError(null);
    const p = new URLSearchParams(search);
    p.set("tab", newMode === "signup" ? "signup" : newMode === "reset" ? "reset" : "signin");
    if (method === "phone") p.set("tab", "phone");
    nav(`/start?${p.toString()}`);
  }

  function switchMethod(newMethod: AuthMethod) {
    void triggerHapticSelection();
    setMethod(newMethod);
    setInlineError(null);
    const p = new URLSearchParams(search);
    if (newMethod === "phone") p.set("tab", "phone");
    else p.set("tab", mode === "signup" ? "signup" : "signin");
    nav(`/start?${p.toString()}`);
  }

  function handleNameChange(val: string) {
    setSignupName(val);
    if (!handleManual) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.length >= 2) {
        setSignupHandle(clean.slice(0, 20));
      }
    }
  }

  function handleHandleChange(val: string) {
    setHandleManual(true);
    setSignupHandle(normalizeHandle(val));
  }

  async function handleEmailSignup(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);

    const nameClean = signupName.trim();
    if (!nameClean || nameClean.length < 2) {
      setInlineError({ message: "Please enter your full name (at least 2 characters)." });
      return;
    }
    if (!emailOk) {
      setInlineError({ message: "Please enter a valid email address." });
      return;
    }
    if (!handleOk) {
      setInlineError({ message: handleStatus.reason || "Please choose a valid available @handle." });
      return;
    }
    if (!passOk) {
      setInlineError({ message: "Password must be at least 8 characters with letters and numbers." });
      return;
    }
    if (!signupAdultConfirmed) {
      setInlineError({ message: "Please confirm you are 18 years or older to join AirPal." });
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = email.trim();
      localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      await register(cleanEmail, nameClean, { password });

      try {
        const h = normalizeHandle(signupHandle);
        await createProfile({
          handle: h,
          name: nameClean,
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
        });
      } catch {
        /* profile may already be initialized */
      }

      toast.success("Account created! Welcome to AirPal.");
      setPendingGo(true);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, "Account creation failed");
      setInlineError({ message: msg, code });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
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

    if (mode === "signup") {
      return handleEmailSignup(e);
    }

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
        const cleanEmail = email.trim();
        localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
        await login(cleanEmail, password);
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
  if (user && !phoneSignup) {
    const isHostUser = Boolean(user.propertyIds?.length || user.role === "host_admin" || user.role === "super_admin");
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm text-center">
          <div className="mx-auto flex justify-center">
            <MeAvatar faceClassName="h-16 w-16 text-xl" />
          </div>
          <h1 className="font-display mt-4 text-2xl font-semibold">{user.displayName || "Your Account"}</h1>
          {mine?.handle ? <p className="mt-0.5 text-xs font-bold text-accent">@{mine.handle}</p> : null}
          <p className="text-xs text-mute mt-1">{user.email || user.phone || "Signed in"}</p>

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
            <BiometricEnrollCard compact />
          </div>

          {user.email && user.emailVerified === false && (
            <div className="mt-4 text-left">
              <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
            </div>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent text-left">
              Quick Navigation
            </p>
            <Button
              className="w-full justify-between"
              disabled={!mine && !biosReady}
              onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
            >
              <span>
                {mine
                  ? `Edit profile (@${mine.handle})`
                  : biosReady
                    ? "Set up your public @handle"
                    : "Loading your @handle…"}
              </span>
              <User size={16} />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={() => nav("/host")}>
              <span>{isHostUser ? "Host Console · Belonging Reports" : "Host Console · PBSA & Venue"}</span>
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
              <span>Your Tickets, Passes & Memories</span>
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
    <div
      className="mx-auto max-w-md px-4 py-8 md:py-12"
      style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 24 } : undefined}
    >
      {isGuestStart && (
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Life Made Easy</p>
          <h1 className="font-display mt-2 text-3xl font-bold leading-tight">
            Find a place. Make&nbsp;a&nbsp;plan. Meet&nbsp;your&nbsp;people.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
            Find places and experiences, make plans with family and friends, and use AirPal Pass & Guide — in one
            account.
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
                tint: "bg-brand/10 text-accent",
              },
              {
                icon: Users,
                title: "What now?",
                desc: "One suggestion",
                to: "/now",
                tint: "bg-amber-500/10 text-amber-700",
              },
            ].map((c) => (
              <button
                key={c.to}
                type="button"
                onClick={() => nav(c.to)}
                className="rounded-2xl ring-1 ring-line bg-card p-3 text-left transition-shadow hover:shadow-sm active:scale-[0.98]"
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
            className="mt-3 inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-accent hover:underline"
          >
            Browse first, join later →
          </button>
        </div>
      )}

      {isBusinessStart && (
        <RoleHero
          kicker="Partner account"
          title={<>Same login. Add the place.</>}
          sub="Import your Google listing — logo, address, phone, website, hours — then guests find you on What's on and in search."
          cta="Open the partner account below — it takes a minute ↓"
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
              tint: "bg-brand/10 text-accent",
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
          kicker="For building operators & hosts"
          title={<>Building community made easy.</>}
          sub="Onboard residents via the 60s Arrival Engine, track Belonging Reports, and dispatch support — in one console."
          cta="Access your operator console below ↓"
          items={[
            {
              icon: Building2,
              title: "60s Arrival Engine",
              desc: "Instant building cohort & room check-in",
              tint: "bg-emerald-500/10 text-emerald-700",
            },
            {
              icon: ShieldCheck,
              title: "Belonging Reports",
              desc: "Loneliness mitigation & cohort connectivity",
              tint: "bg-brand/10 text-accent",
            },
            {
              icon: Users,
              title: "Resident Support",
              desc: "Quick helpdesk & staff dispatch",
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
            { icon: Store, title: "Sell stalls", desc: "Vendors book & pay online", tint: "bg-brand/10 text-accent" },
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
            { icon: Users, title: "Vote on stops", desc: "Everyone gets a say", tint: "bg-brand/10 text-accent" },
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
          You’re invited by <span className="font-semibold text-accent">@{inviterHandle}</span> — your signup lands you
          in the{" "}
          <Link href="/founders" className="font-semibold text-accent hover:underline">
            Founders 100K pool
          </Link>
        </p>
      )}

      {/* Main Card */}
      <div
        id="auth-card"
        className="rounded-3xl ring-1 ring-line/70 bg-card/95 backdrop-blur-md p-6 shadow-sm border border-line/40 scroll-mt-4"
      >
        {mode === "reset" ? (
          /* Password Reset Flow */
          <div>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
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
                      enterKeyHint="go"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={nudgeIntoView}
                      placeholder="you@example.com"
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
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
                aria-pressed={mode === "signin"}
                className={cn(
                  "flex-1 rounded-full min-h-[44px] text-center text-xs font-semibold transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  mode === "signin" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                aria-pressed={mode === "signup"}
                className={cn(
                  "flex-1 rounded-full min-h-[44px] text-center text-xs font-semibold transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  mode === "signup" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Create Account
              </button>
            </div>

            {/* Goal-Gradient & Zeigarnik Effect: Clear Progress Indication */}
            {mode === "signup" && (
              <div className="mt-3.5 rounded-2xl bg-paper/70 p-3 ring-1 ring-line/70">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                  <span className="text-accent">Step 1 of 2: Create Free Account</span>
                  <span className="text-mute font-medium">~30 sec setup</span>
                </div>
                <div className="flex gap-1.5 h-1">
                  <div className="flex-1 rounded-full bg-brand" />
                  <div className="flex-1 rounded-full bg-line" />
                </div>
              </div>
            )}

            {/* Method selector for Email vs Mobile SMS */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => switchMethod("email")}
                aria-pressed={method === "email"}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer",
                  method === "email"
                    ? "bg-brand text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line/80",
                )}
              >
                <Mail size={13} />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => switchMethod("phone")}
                aria-pressed={method === "phone"}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer",
                  method === "phone"
                    ? "bg-brand text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line/80",
                )}
              >
                <Phone size={13} />
                <span>Mobile SMS</span>
              </button>
            </div>

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
                        className="mt-1 font-semibold text-accent underline block cursor-pointer"
                      >
                        Sign in with this email instead →
                      </button>
                    )}
                    {(inlineError.code === "auth/wrong-password" || inlineError.code === "auth/invalid-credential") && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="mt-1 font-semibold text-accent underline block cursor-pointer"
                      >
                        Forgot your password? Reset it here →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {mode === "signin" && hasEnrolledBiometrics && (
              <div className="mt-4">
                <BiometricAuthButton variant="hero" onSuccess={() => setPendingGo(true)} />
              </div>
            )}

            <div className="mt-4">
              <SocialAuthButtons
                busy={busy}
                showBiometrics={false}
                onSocial={async (provider) => {
                  setInlineError(null);
                  await loginWithSocial(provider);
                  toast.success("Signed in successfully!");
                  setPendingGo(true);
                }}
              />
              <SocialAuthDivider />
            </div>

            {method === "phone" ? (
              mode === "signup" ? (
                <div className="mt-2">
                  <SignupFlow
                    onDone={() => {
                      setPhoneSignup(false);
                      setPendingGo(true);
                    }}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3 flex justify-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line">
                    <button
                      type="button"
                      onClick={() => setPhoneLoginMode("password")}
                      aria-pressed={phoneLoginMode === "password"}
                      className={cn(
                        "inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold cursor-pointer",
                        phoneLoginMode === "password" ? "bg-brand text-white" : "text-mute",
                      )}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneLoginMode("sms")}
                      aria-pressed={phoneLoginMode === "sms"}
                      className={cn(
                        "inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold cursor-pointer",
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
                            enterKeyHint="go"
                            onFocus={nudgeIntoView}
                            className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
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
                          className="text-xs font-medium text-accent hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-11 text-sm font-bold shadow-[0_4px_16px_rgba(18,22,20,0.15)]"
                        disabled={busy}
                        loading={busy}
                      >
                        {busy ? "Signing in…" : "Sign In"}
                      </Button>
                      <p className="text-center text-[12px] text-mute">
                        SMS code always works if phone + password isn&apos;t set up yet.
                      </p>
                    </form>
                  )}
                </div>
              )
            ) : mode === "signup" ? (
              /* Enhanced Direct Email Signup */
              <form onSubmit={handleEmailSignup} className="mt-4 space-y-3.5">
                <ValidField
                  label="Full Name"
                  ok={signupName.trim().length >= 2}
                  error={signupName && signupName.trim().length < 2 ? "Please enter at least 2 characters" : null}
                >
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Alex Rivera"
                      autoComplete="name"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                  </div>
                </ValidField>

                <ValidField
                  label="Email Address"
                  ok={emailOk}
                  error={email && !emailOk ? "Please enter a valid email address" : null}
                >
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      autoComplete="email"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                  </div>
                </ValidField>

                <ValidField
                  label="AirPal Me @handle"
                  ok={handleOk}
                  error={
                    signupHandle && !handleStatus.checking && !handleOk
                      ? handleStatus.reason || "Handle unavailable"
                      : null
                  }
                  hint={
                    handleStatus.checking
                      ? "Checking availability…"
                      : handleOk
                        ? `🎉 @${signupHandle} is reserved for you!`
                        : "Claim your unique link: airpal.me/@" + (signupHandle || "yourname")
                  }
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-mute">@</span>
                    <input
                      type="text"
                      value={signupHandle}
                      onChange={(e) => handleHandleChange(e.target.value)}
                      placeholder="alex"
                      autoComplete="username"
                      autoCapitalize="none"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-8 pr-9", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    {handleOk && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                        <Check size={16} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </ValidField>

                <ValidField
                  label="Create Password"
                  ok={passOk}
                  error={password && !passOk ? "At least 8 chars with letters & numbers" : null}
                >
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </ValidField>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-mute font-medium">Password Strength</span>
                      <span
                        className={cn(
                          "font-bold",
                          passwordStrength.score >= 3
                            ? "text-emerald-600 dark:text-emerald-400"
                            : passwordStrength.score === 2
                              ? "text-amber-500"
                              : "text-red-500",
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={cn(
                            "flex-1 rounded-full transition-all duration-300",
                            bar <= passwordStrength.score ? passwordStrength.color : "bg-line/50",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Age & Terms Confirmation */}
                <label className="flex items-start gap-2.5 pt-1 text-left cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signupAdultConfirmed}
                    onChange={(e) => setSignupAdultConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-brand cursor-pointer"
                  />
                  <span className="text-xs text-mute leading-snug">
                    I confirm I am 18 years or older and agree to the{" "}
                    <Link href="/terms" className="font-semibold text-accent hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-semibold text-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-bold shadow-[0_4px_16px_rgba(18,22,20,0.15)] mt-2 cursor-pointer"
                  disabled={
                    busy || !emailOk || !passOk || !handleOk || signupName.trim().length < 2 || !signupAdultConfirmed
                  }
                  loading={busy}
                >
                  {busy ? "Creating account…" : "Create My AirPal Account"}
                </Button>
                <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-mute font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> Free to join
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> No credit card
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> Cancel anytime
                  </span>
                </div>
              </form>
            ) : (
              /* Enhanced Direct Email Sign In */
              <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
                <ValidField label="Email Address" ok={emailOk} error={email && !emailOk ? "Enter a valid email" : null}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      enterKeyHint="next"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={nudgeIntoView}
                      placeholder="you@domain.com"
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
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
                      enterKeyHint="go"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </ValidField>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 text-mute cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-brand cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-bold shadow-[0_4px_16px_rgba(18,22,20,0.15)] mt-2"
                  disabled={busy || !emailOk || !password}
                  loading={busy}
                >
                  {busy ? "Signing in…" : "Sign In"}
                </Button>
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
                    className="font-semibold text-accent hover:underline"
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
                    className="font-semibold text-accent hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Trust & Security Badge */}
            <div className="mt-4 flex flex-col items-center justify-center gap-1 text-[11px] text-mute/80">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">AirPal Trust &amp; Safety Certified</span>
              </div>
              <span className="text-[10.5px]">
                256-bit Encrypted · Australian Privacy Act Compliant · Human Moderated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Role Portal Quick Links */}
      <div className="mt-6 text-center">
        <p className="text-xs text-mute">
          Explore partner options:{" "}
          <Link href="/join" className="text-accent font-medium hover:underline">
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
