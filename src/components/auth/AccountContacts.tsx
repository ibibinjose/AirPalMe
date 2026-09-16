import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authErrorMessage } from "@shared/auth-email";
import { formatPhoneDisplay, isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { isEmail } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/forms/PhoneField";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { PHONE_RECAPTCHA_ID, resetPhoneLogin } from "@/lib/phone-auth";

export function AccountContacts({ compact }: { compact?: boolean }) {
  const {
    user,
    sendVerificationEmail,
    sendAccountPhoneCode,
    confirmAccountPhoneCode,
    removePhoneNumber,
    updateEmailAddress,
    removeEmailAddress,
  } = useAuth();
  const [phoneEdit, setPhoneEdit] = useState(false);
  const [emailEdit, setEmailEdit] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => resetPhoneLogin();
  }, []);

  if (!user) return null;

  const phoneOk = phoneReady(phone);
  const codeOk = isOtp(code);
  const emailOk = isEmail(email);

  async function sendCode() {
    if (!phoneOk) {
      toast.error("Need a real mobile number with country code");
      return;
    }
    setBusy(true);
    try {
      await sendAccountPhoneCode(phone);
      setCodeStep(true);
      toast.success("Code sent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send the code"));
      resetPhoneLogin();
    } finally {
      setBusy(false);
    }
  }

  async function savePhone(e: FormEvent) {
    e.preventDefault();
    if (!codeStep) {
      await sendCode();
      return;
    }
    if (!codeOk) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await confirmAccountPhoneCode(normalizeOtp(code));
      toast.success("Mobile number saved");
      setPhoneEdit(false);
      setCodeStep(false);
      setPhone("");
      setCode("");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not save the mobile number"));
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    if (!emailOk) {
      toast.error("Need a real email");
      return;
    }
    setBusy(true);
    try {
      await updateEmailAddress(email.trim());
      toast.success("Check that inbox to confirm the address");
      setEmailEdit(false);
      setEmail("");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not save the email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={compact ? "mt-6" : "mt-8"}>
      {!compact && <h2 className="font-display text-xl">Contact</h2>}
      <div className="mt-3 space-y-2">
        <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <p className="text-[12px] text-mute">Mobile number</p>
          <p className="font-medium">{user.phone ? formatPhoneDisplay(user.phone) : "Not added"}</p>
          {user.phoneVerified && <p className="text-[12px] text-emerald-700">Confirmed</p>}
          {!phoneEdit ? (
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setPhoneEdit(true);
                  setCodeStep(false);
                  setPhone(user.phone || "");
                }}
              >
                {user.phone ? "Change" : "Add"}
              </button>
              {user.phone && (
                <button
                  type="button"
                  className="text-mute"
                  onClick={() => {
                    if (!window.confirm("Remove this mobile number from the account?")) return;
                    setBusy(true);
                    void removePhoneNumber()
                      .then(() => toast.success("Mobile number removed"))
                      .catch((err) => toast.error(authErrorMessage(err, "Could not remove")))
                      .finally(() => setBusy(false));
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <form className="mt-3 space-y-2" onSubmit={(e) => void savePhone(e)}>
              {!codeStep ? (
                <PhoneField value={phone} onChange={setPhone} required />
              ) : (
                <ValidField label="6-digit code" ok={codeOk}>
                  <input
                    value={code}
                    onChange={(e) => setCode(normalizeOtp(e.target.value))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className={fieldInput}
                  />
                </ValidField>
              )}
              <div id={PHONE_RECAPTCHA_ID} className="flex min-h-[78px] justify-center overflow-hidden rounded-2xl bg-paper p-2 ring-1 ring-line" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy} loading={busy}>
                  {busy ? "Please wait…" : codeStep ? "Save mobile" : "Send code"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPhoneEdit(false);
                    setCodeStep(false);
                    resetPhoneLogin();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <p className="text-[12px] text-mute">Email</p>
          <p className="font-medium break-all">{user.email || "Not added"}</p>
          {user.email && (
            <p className={`text-[12px] ${user.emailVerified ? "text-emerald-700" : "text-mute"}`}>
              {user.emailVerified ? "Confirmed" : "Not confirmed"}
            </p>
          )}
          {!emailEdit ? (
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setEmailEdit(true);
                  setEmail(user.email || "");
                }}
              >
                {user.email ? "Change" : "Add"}
              </button>
              {user.email && !user.emailVerified && (
                <button
                  type="button"
                  className="text-brand"
                  onClick={() => {
                    setBusy(true);
                    void sendVerificationEmail()
                      .then(() => toast.success("Verification email sent"))
                      .catch((err) => toast.error(authErrorMessage(err, "Could not send")))
                      .finally(() => setBusy(false));
                  }}
                >
                  Resend confirm
                </button>
              )}
              {user.email && user.phone && (
                <button
                  type="button"
                  className="text-mute"
                  onClick={() => {
                    if (!window.confirm("Remove this email from the account?")) return;
                    setBusy(true);
                    void removeEmailAddress()
                      .then(() => toast.success("Email removed"))
                      .catch((err) => toast.error(authErrorMessage(err, "Could not remove")))
                      .finally(() => setBusy(false));
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <form className="mt-3 space-y-2" onSubmit={(e) => void saveEmail(e)}>
              <ValidField label="Email" ok={emailOk} error={email && !emailOk ? "Need a real email" : null}>
                <input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={fieldInput} />
              </ValidField>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy || !emailOk} loading={busy}>
                  {busy ? "Please wait…" : "Save email"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEmailEdit(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
