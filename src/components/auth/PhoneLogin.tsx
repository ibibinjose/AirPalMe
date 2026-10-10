import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Phone, User, ArrowLeft, RefreshCw } from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { handleFromName, normalizeHandle, randomHexHandle } from "@shared/bio";
import { isEmail } from "@shared/validate";
import { isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/forms/PhoneField";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { PHONE_RECAPTCHA_ID, resetPhoneLogin } from "@/lib/phone-auth";
import { loadBios } from "@/lib/bio-store";
import { getFirebaseAuth } from "@/lib/firebase";
import { cn } from "@/lib/cn";

export function PhoneLogin({
  onBegin,
  onDone,
  onNeedAccount,
}: {
  onBegin?: () => void;
  onDone: () => void;
  /** SMS confirmed but no AirPal account yet — send them to Create account. */
  onNeedAccount?: () => void;
}) {
  const { sendPhoneCode, confirmPhoneCode, completePhoneProfile } = useAuth();
  const { createProfile } = useBio();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "profile">("phone");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const handleStatus = useHandleStatus(handle);

  const phoneOk = phoneReady(phone);
  const codeOk = isOtp(code);
  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email);
  const handleOk = handleStatus.ok;
  const profileOk = nameOk && emailOk && handleOk;

  useEffect(() => {
    return () => resetPhoneLogin();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    if (!phoneOk) {
      toast.error("Need a real mobile number with country code");
      return;
    }
    setBusy(true);
    onBegin?.();
    try {
      await sendPhoneCode(phone);
      setStep("code");
      setWait(30);
      toast.success("SMS verification code sent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send the code. Please try again."));
      resetPhoneLogin();
    } finally {
      setBusy(false);
    }
  }

  async function finishIfReturning(): Promise<boolean> {
    const uid = getFirebaseAuth()?.currentUser?.uid;
    const fb = getFirebaseAuth()?.currentUser;
    if (!uid || !fb) return false;
    const existing = loadBios().find((p) => p.ownerUid === uid);
    if (existing && (fb.email || fb.displayName)) {
      toast.success("Welcome back!");
      onDone();
      return true;
    }
    if (fb.displayName) setName(fb.displayName);
    if (fb.email) setEmail(fb.email);
    if (existing?.handle) {
      setHandle(existing.handle);
      setHandleTouched(true);
    }
    return false;
  }

  async function saveProfile() {
    if (!profileOk) {
      toast.error("Please add your name, @handle, and email");
      return;
    }
    setBusy(true);
    try {
      await completePhoneProfile({ name: name.trim(), email: email.trim() });
      await createProfile({
        handle: normalizeHandle(handle),
        name: name.trim(),
        city: "Sydney",
        shortWhy: "On AirPal",
        kind: "person",
        phone,
      });
      toast.success("Profile saved! Check your email to confirm the address.");
      onDone();
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not save your profile"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "phone") {
      await sendCode();
      return;
    }
    if (step === "code") {
      if (!codeOk) {
        toast.error("Enter the 6-digit verification code");
        return;
      }
      setBusy(true);
      onBegin?.();
      try {
        await confirmPhoneCode(normalizeOtp(code));
        resetPhoneLogin();
        if (await finishIfReturning()) return;
        if (onNeedAccount) {
          toast.message("No AirPal account on this number yet — create one.");
          onNeedAccount();
          return;
        }
        setStep("profile");
        toast.success("Mobile number confirmed!");
      } catch (err) {
        toast.error(authErrorMessage(err, "Invalid code. Please double check and try again."));
      } finally {
        setBusy(false);
      }
      return;
    }
    await saveProfile();
  }

  return (
    <div className="space-y-4">
      {/* 3-Step Progress Indicator */}
      <div className="flex items-center justify-between px-1">
        {[
          { id: "phone", label: "Mobile", icon: Phone },
          { id: "code", label: "Code", icon: KeyRound },
          { id: "profile", label: "Profile", icon: User },
        ].map((s, idx) => {
          const isDone = (s.id === "phone" && step !== "phone") || (s.id === "code" && step === "profile");
          const isCurrent = step === s.id;
          const StepIcon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition",
                  isDone
                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                    : isCurrent
                      ? "bg-brand text-white ring-2 ring-brand/30"
                      : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {isDone ? <Check size={12} strokeWidth={2.5} /> : <StepIcon size={12} />}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  isCurrent ? "text-ink font-semibold" : "text-mute",
                )}
              >
                {s.label}
              </span>
              {idx < 2 && <div className="h-0.5 w-6 bg-line sm:w-10" />}
            </div>
          );
        })}
      </div>

      <form className="mt-2 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {/* Step 1: Phone */}
        {step === "phone" && (
          <div className="space-y-2">
            <p className="text-xs text-mute leading-relaxed">
              Enter your mobile number with country code. We’ll text an SMS code — no password needed.
            </p>
            <PhoneField value={phone} onChange={setPhone} required />
          </div>
        )}

        {/* Step 2: Code */}
        {step === "code" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-paper p-3 text-xs flex items-center justify-between ring-1 ring-line">
              <div>
                <span className="text-mute block text-[11px]">Sent SMS to</span>
                <span className="font-semibold text-ink">{phone}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  resetPhoneLogin();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <ArrowLeft size={12} /> Change
              </button>
            </div>

            <ValidField
              label="6-Digit Verification Code"
              ok={codeOk}
              error={code && !codeOk ? "Must be 6 digits" : null}
            >
              <input
                value={code}
                onChange={(e) => setCode(normalizeOtp(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className={cn(fieldInput, "font-mono tracking-[0.35em] text-center text-lg font-semibold")}
                autoFocus
              />
            </ValidField>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-mute">Didn't receive the code?</span>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  wait > 0 || busy ? "text-mute cursor-not-allowed" : "text-accent hover:underline",
                )}
                disabled={busy || wait > 0}
                onClick={() => void sendCode()}
              >
                <RefreshCw size={12} className={wait > 0 ? "animate-spin" : ""} />
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Setup */}
        {step === "profile" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20">
              <p className="font-medium">Mobile verified! Choose how you appear on AirPal.</p>
            </div>

            <ValidField label="Full Name" ok={nameOk}>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!handleTouched) setHandle(handleFromName(e.target.value));
                }}
                placeholder="e.g. Jordan Lee"
                autoComplete="name"
                className={fieldInput}
                autoFocus
              />
            </ValidField>

            <ValidField
              label={`AirPal Me @${normalizeHandle(handle) || "handle"}`}
              ok={handleOk}
              error={handle && !handleStatus.checking ? handleStatus.reason || null : null}
              hint={handleStatus.checking ? "Checking availability…" : "Word handle or hexadecimal ID"}
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
                >
                  Hex ID
                </button>
              </div>
            </ValidField>

            <ValidField label="Recovery Email" ok={emailOk} error={email && !emailOk ? "Enter a valid email" : null}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className={fieldInput}
              />
            </ValidField>
            <p className="text-[11px] text-mute">
              We'll email a verification link. Your primary login stays on mobile SMS.
            </p>
          </div>
        )}

        {/* reCAPTCHA security badge container */}
        {(step === "phone" || step === "code") && (
          <div
            id={PHONE_RECAPTCHA_ID}
            className="flex min-h-[78px] justify-center overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-line"
          />
        )}

        {/* Submit Action */}
        <Button
          type="submit"
          className="w-full mt-2"
          disabled={busy || (step === "phone" ? !phoneOk : step === "code" ? !codeOk : !profileOk)}
          loading={busy}
        >
          {busy
            ? "Please wait…"
            : step === "phone"
              ? "Send SMS Code"
              : step === "code"
                ? "Verify & Continue"
                : "Save Profile & Finish"}
        </Button>
      </form>
    </div>
  );
}
