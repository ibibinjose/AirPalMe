import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AtSign, Check, Eye, EyeOff, KeyRound, Lock, Mail, Phone, User } from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { normalizeHandle, randomHexHandle } from "@shared/bio";
import { isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { PASSWORD_RULES, isEmail, passwordIssues, passwordOk } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/forms/PhoneField";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { resetPhoneLogin } from "@/lib/phone-auth";
import { cn } from "@/lib/cn";

type Step = "handle" | "code" | "account";

export function SignupFlow({ onDone }: { onDone: () => void }) {
  const { sendPhoneCode, confirmPhoneCode, linkEmailPassword, completeAccount, sendVerificationEmail } = useAuth();
  const { createProfile, updateProfile, mine } = useBio();

  const [step, setStep] = useState<Step>("handle");
  const [handle, setHandle] = useState(mine?.handle || "");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(mine?.name || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const handleStatus = useHandleStatus(handle, mine?.id);

  const handleOk = handleStatus.ok;
  const phoneOk = phoneReady(phone);
  const codeOk = isOtp(code);
  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email);
  const passOk = passwordOk(password);

  useEffect(() => () => resetPhoneLogin(), []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    if (!handleOk) {
      toast.error(handleStatus.reason || "Pick a free @handle");
      return;
    }
    if (!phoneOk) {
      toast.error("Need a real mobile number with country code");
      return;
    }
    setBusy(true);
    try {
      await sendPhoneCode(phone);
      setStep("code");
      setWait(30);
      toast.success("SMS code sent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send the code."));
      resetPhoneLogin();
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (!codeOk) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await confirmPhoneCode(normalizeOtp(code));
      resetPhoneLogin();
      try {
        await createProfile({
          handle: normalizeHandle(handle),
          name: name.trim() || normalizeHandle(handle),
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
          phone,
        });
      } catch {
        /* handle may already be this user's */
      }
      setStep("account");
      toast.success("Mobile confirmed");
    } catch (err) {
      toast.error(authErrorMessage(err, "Invalid code. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function finishAccount() {
    if (!nameOk || !emailOk || !passOk) {
      toast.error("Add your name, email, and a strong password");
      return;
    }
    setBusy(true);
    try {
      await linkEmailPassword(email.trim(), password);
      const h = normalizeHandle(handle);
      if (mine?.handle) {
        await updateProfile({ handle: mine.handle, name: name.trim(), phone });
      } else {
        await createProfile({
          handle: h,
          name: name.trim(),
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
          phone,
        });
      }
      try {
        await completeAccount({ handle: h, name: name.trim(), email: email.trim() });
      } catch {
        /* local profile already saved */
      }
      try {
        await sendVerificationEmail();
      } catch {
        /* linkEmailPassword already sends one */
      }
      toast.success("Account created. Check your email to confirm the address.");
      onDone();
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not finish your account"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "handle") return sendCode();
    if (step === "code") return confirmCode();
    return finishAccount();
  }

  const steps: Array<{ id: Step; label: string; icon: typeof Phone }> = [
    { id: "handle", label: "Handle", icon: AtSign },
    { id: "code", label: "SMS", icon: KeyRound },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        {steps.map((s, idx) => {
          const order = steps.findIndex((x) => x.id === step);
          const isDone = idx < order;
          const isCurrent = s.id === step;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold",
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-brand text-white"
                      : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {isDone ? <Check size={12} strokeWidth={2.5} /> : <Icon size={12} />}
              </div>
              <span className={cn("hidden text-xs font-medium sm:inline", isCurrent ? "text-ink" : "text-mute")}>
                {s.label}
              </span>
              {idx < 2 && <div className="h-0.5 w-6 bg-line sm:w-10" />}
            </div>
          );
        })}
      </div>

      <form className="space-y-3.5" onSubmit={(e) => void onSubmit(e)}>
        {step === "handle" && (
          <>
            <p className="text-xs leading-relaxed text-mute">
              Pick your personal @handle and confirm your mobile. You can add a business place later.
            </p>
            <ValidField
              label={`Personal @${normalizeHandle(handle) || "handle"}`}
              ok={handleOk}
              error={handle && !handleStatus.checking ? handleStatus.reason || null : null}
              hint={handleStatus.checking ? "Checking…" : "This is you — not your café or hotel"}
            >
              <div className="flex gap-2">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="maya"
                  autoComplete="username"
                  className={fieldInput}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setHandle(randomHexHandle(8))}
                  className="shrink-0 rounded-2xl bg-paper px-3 text-xs font-medium text-mute ring-1 ring-line hover:text-ink"
                >
                  Hex ID
                </button>
              </div>
            </ValidField>
            <ValidField label="Mobile number" ok={phoneOk} error={phone && !phoneOk ? "Include country code" : null}>
              <PhoneField value={phone} onChange={setPhone} />
            </ValidField>
            <Button type="submit" className="w-full" disabled={busy || !handleOk || !phoneOk} loading={busy}>
              {busy ? "Sending…" : "Send SMS code"}
            </Button>
          </>
        )}

        {step === "code" && (
          <>
            <p className="text-xs leading-relaxed text-mute">Enter the 6-digit code we sent to {phone}.</p>
            <ValidField label="SMS code" ok={codeOk}>
              <input
                value={code}
                onChange={(e) => setCode(normalizeOtp(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className={fieldInput}
                autoFocus
              />
            </ValidField>
            <Button type="submit" className="w-full" disabled={busy || !codeOk} loading={busy}>
              {busy ? "Checking…" : "Confirm mobile"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs font-medium text-brand disabled:text-mute"
              disabled={wait > 0 || busy}
              onClick={() => void sendCode()}
            >
              {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
            </button>
          </>
        )}

        {step === "account" && (
          <>
            <p className="text-xs leading-relaxed text-mute">
              Name, email, and a password so you can sign in again. We’ll send a verification link to the email.
            </p>
            <ValidField label="Your name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  autoComplete="name"
                  className={cn(fieldInput, "pl-10")}
                  autoFocus
                />
              </div>
            </ValidField>
            <ValidField label="Email" ok={emailOk} error={email && !emailOk ? "Enter a valid email" : null}>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="email"
                  className={cn(fieldInput, "pl-10")}
                />
              </div>
            </ValidField>
            <ValidField label="Password" ok={passOk}>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn(fieldInput, "pl-10 pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </ValidField>
            {password && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute">
                {PASSWORD_RULES.map((rule) => {
                  const met = !passwordIssues(password).includes(rule.id);
                  return (
                    <span
                      key={rule.id}
                      className={cn(
                        "inline-flex items-center gap-1",
                        met ? "font-medium text-emerald-600" : "text-mute",
                      )}
                    >
                      <Check size={12} /> {rule.label}
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-mute">
              @{normalizeHandle(handle) || "handle"} is your personal profile. Add a place later if you run a business.
            </p>
            <Button type="submit" className="w-full" disabled={busy || !nameOk || !emailOk || !passOk} loading={busy}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
