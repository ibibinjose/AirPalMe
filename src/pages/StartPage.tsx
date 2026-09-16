import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { handleFromName, normalizeHandle, randomHexHandle } from "@shared/bio";
import { PASSWORD_RULES, isEmail, passwordIssues, passwordOk } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { liveBackendEnabled } from "@/lib/functions";
import {
  normalizeInviteCode,
  recordAppInvite,
  resolveInviter,
  stashInviteRef,
  takeInviteRef,
} from "@/lib/app-invites";
import { cn } from "@/lib/cn";

type AuthMode = "signin" | "signup" | "reset";
type AuthMethod = "email" | "phone";

export function StartPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const tabParam = params.get("tab");
  const refParam = params.get("ref") || "";
  const next = params.get("next") || "";
  const roleParam = params.get("role") || "";
  const emailParam = params.get("email") || "";
  const [, nav] = useLocation();

  const { login, register, user, sendVerificationEmail, requestPasswordReset, logout } = useAuth();
  const { mine, business, createProfile } = useBio();

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
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);

  // UI state
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [phoneSignup, setPhoneSignup] = useState(false);
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const handleStatus = useHandleStatus(handle);

  const emailOk = isEmail(email);
  const passOk = passwordOk(password);
  const nameOk = name.trim().length >= 2;
  const handleOk = handleStatus.ok;

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
        kicker: "Local Business",
        title: "Sign in to Place Portal",
        signupTitle: "List your Local Business",
        desc: "Claim your public @handle, publish local perks, and welcome neighbourhood visitors.",
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
      kicker: "AirPal.me",
      title: "Welcome back",
      signupTitle: "Create your AirPal account",
      desc: "One secure login for your personal @handle, concierge stays, places, and events.",
      color: "text-brand",
      bg: "bg-brand/10",
    };
  }, [roleParam, next]);

  function afterIn() {
    if (next) {
      nav(next);
      return;
    }
    if (business) {
      nav("/host");
      return;
    }
    if (mine) {
      nav("/me");
      return;
    }
    nav("/bio/setup");
  }

  useEffect(() => {
    if (user && next && !phoneSignup) nav(next);
  }, [user, next, nav, phoneSignup]);

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

    // Sign Up validation
    if (mode === "signup") {
      if (!nameOk) {
        setInlineError({ message: "Please enter your full name (at least 2 characters)." });
        return;
      }
      if (!handleOk) {
        setInlineError({ message: handleStatus.reason || "Please choose a valid personal @handle." });
        return;
      }
      if (!emailOk) {
        setInlineError({ message: "Please enter a valid email address." });
        return;
      }
      const missing = passwordIssues(password);
      if (missing.length > 0) {
        const labels = PASSWORD_RULES.filter((r) => missing.includes(r.id)).map((r) => r.label);
        setInlineError({ message: `Password needs: ${labels.join(", ").toLowerCase()}.` });
        return;
      }
    }

    // Sign In validation
    if (mode === "signin") {
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
      if (mode === "signin") {
        await login(email.trim(), password);
        toast.success("Signed in successfully!");
        afterIn();
      } else {
        await register(email.trim(), name.trim(), { password });
        try {
          await createProfile({
            handle: normalizeHandle(handle),
            name: name.trim(),
            city: "Sydney",
            shortWhy: "On AirPal",
            kind: "person",
          });
        } catch {
          /* account is created; user can also pick or adjust handle in /bio/setup */
        }
        toast.success("Account created! Check your inbox to confirm your email.");
        if (next) nav(next);
        else nav("/me");
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, mode === "signin" ? "Sign in failed" : "Sign up failed");

      if (!liveBackendEnabled() && mode === "signup") {
        toast.message("Saved on this device (demo mode)");
        nav(next || "/bio/setup");
      } else if (!liveBackendEnabled()) {
        toast.message("Demo mode sign-in");
        afterIn();
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
        <p className="mb-4 rounded-2xl border-2 border-ink bg-card px-4 py-3 text-center text-sm">
          You’re invited by <span className="font-semibold text-brand">@{inviterHandle}</span>
        </p>
      )}

      {/* Main Card */}
      <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm">
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
                  mode === "signin" ? "bg-ink text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={cn(
                  "flex-1 rounded-full py-2 text-center text-xs font-semibold transition",
                  mode === "signup" ? "bg-ink text-white shadow-xs" : "text-mute hover:text-ink",
                )}
              >
                Create Account
              </button>
            </div>

            {/* Secondary Method Switcher: Email vs Mobile Phone */}
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

            {/* Form Area */}
            {method === "phone" ? (
              <div className="mt-4">
                <PhoneLogin
                  onBegin={() => setPhoneSignup(true)}
                  onDone={() => {
                    setPhoneSignup(false);
                    afterIn();
                  }}
                />
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
                {/* Sign Up extra fields */}
                {mode === "signup" && (
                  <>
                    <ValidField label="Full Name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                        <input
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (!handleTouched) setHandle(handleFromName(e.target.value));
                          }}
                          placeholder="e.g. Alex Rivera"
                          autoComplete="name"
                          className={cn(fieldInput, "pl-10")}
                          autoFocus
                        />
                      </div>
                    </ValidField>

                    <ValidField
                      label={`Public @${normalizeHandle(handle) || "handle"}`}
                      ok={handleOk}
                      error={handle && !handleStatus.checking ? handleStatus.reason || null : null}
                      hint={handleStatus.checking ? "Checking availability…" : "Unique username or hex id"}
                    >
                      <div className="flex gap-2">
                        <input
                          value={handle}
                          onChange={(e) => {
                            setHandleTouched(true);
                            setHandle(e.target.value);
                          }}
                          placeholder="username"
                          autoComplete="username"
                          className={fieldInput}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setHandleTouched(true);
                            setHandle(randomHexHandle(8));
                          }}
                          className="shrink-0 rounded-2xl bg-paper px-3 text-xs font-medium text-mute ring-1 ring-line hover:text-ink"
                          title="Generate a unique hex code"
                        >
                          Hex ID
                        </button>
                      </div>
                    </ValidField>
                  </>
                )}

                {/* Email Address */}
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
                      autoFocus={mode === "signin"}
                    />
                  </div>
                </ValidField>

                {/* Password with Eye Toggle */}
                <ValidField
                  label="Password"
                  ok={mode === "signin" ? Boolean(password) : passOk}
                  error={null}
                >
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
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

                {/* Sign Up Password Strength Indicator */}
                {mode === "signup" && password && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute" aria-live="polite">
                    {PASSWORD_RULES.map((rule) => {
                      const met = !passwordIssues(password).includes(rule.id);
                      return (
                        <span
                          key={rule.id}
                          className={cn(
                            "inline-flex items-center gap-1",
                            met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-mute",
                          )}
                        >
                          <Check size={12} /> {rule.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Forgot Password Link on Sign In */}
                {mode === "signin" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full mt-2" disabled={busy} loading={busy}>
                  {busy
                    ? mode === "signin"
                      ? "Signing in…"
                      : "Creating account…"
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Free Account"}
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
