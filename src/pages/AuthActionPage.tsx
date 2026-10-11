import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { authErrorMessage, parseAuthActionSearch, safeContinuePath } from "@shared/auth-email";
import { passwordOk } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { applyEmailVerificationCode, emailForPasswordResetCode, submitPasswordReset } from "@/lib/auth-mail";
import { LEGAL } from "@/lib/legal";
import { liveBackendEnabled } from "@/lib/functions";

type Phase = "loading" | "form" | "done" | "error";

export function AuthActionPage() {
  const search = useSearch();
  const [, nav] = useLocation();
  const action = parseAuthActionSearch(search);
  const origin = typeof window !== "undefined" ? window.location.origin : LEGAL.site;
  const continueTo = safeContinuePath(action.continueUrl, origin);
  const [phase, setPhase] = useState<Phase>(() => {
    if (!action.oobCode) return "error";
    if (action.mode === "resetPassword" || action.mode === "verifyEmail" || action.mode === "recoverEmail")
      return "loading";
    return "error";
  });
  const [message, setMessage] = useState(
    action.oobCode ? "" : "This link is missing a code. Open the latest email from AirPal.Me.",
  );
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const passOk = passwordOk(password);

  useEffect(() => {
    if (!action.oobCode) {
      setPhase("error");
      setMessage("This link is missing a code. Open the latest email from AirPal.Me.");
      return;
    }
    if (action.mode === "verifyEmail" || action.mode === "recoverEmail") {
      setPhase("loading");
      void applyEmailVerificationCode(action.oobCode)
        .then(() => {
          setPhase("done");
          setMessage(action.mode === "recoverEmail" ? "Email restored." : "Email confirmed. You can use this account.");
        })
        .catch((err) => {
          setPhase("error");
          setMessage(authErrorMessage(err, "This link is invalid or already used."));
        });
      return;
    }
    if (action.mode === "resetPassword") {
      setPhase("loading");
      void emailForPasswordResetCode(action.oobCode)
        .then((email) => {
          setAccountEmail(email);
          setPhase("form");
        })
        .catch((err) => {
          setPhase("error");
          setMessage(authErrorMessage(err, "This reset link is invalid or already used."));
        });
      return;
    }
    setPhase("error");
    setMessage("This sign-in link is not used on AirPal.Me. Sign in with email and password.");
  }, [action.mode, action.oobCode]);

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (!passOk) {
      toast.error("At least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await submitPasswordReset(action.oobCode, password);
      setPhase("done");
      setMessage("Password updated. Sign in with the new one.");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not update password"));
    } finally {
      setBusy(false);
    }
  }

  const title =
    action.mode === "resetPassword"
      ? "New password"
      : action.mode === "recoverEmail"
        ? "Restore email"
        : "Confirm email";

  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-28">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Account</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{title}</h1>

      {phase === "loading" && <PageLoading label="Checking the link…" />}

      {phase === "error" && (
        <>
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-700 ring-1 ring-red-500/20 dark:text-red-300"
          >
            {message}
          </p>
          <div className="mt-6 space-y-2">
            <Button className="w-full" onClick={() => nav("/start?tab=reset")}>
              Request a new link
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => nav("/start?tab=signin")}>
              Sign in
            </Button>
          </div>
        </>
      )}

      {phase === "done" && (
        <>
          <p className="mt-4 text-sm text-mute">{message}</p>
          <Button className="mt-6 w-full" onClick={() => nav(continueTo || "/start?tab=signin")}>
            Continue
          </Button>
        </>
      )}

      {phase === "form" && action.mode === "resetPassword" && (
        <>
          <p className="mt-2 text-sm text-mute">
            {accountEmail ? `Choose a new password for ${accountEmail}.` : "Choose a new password."} At least 8
            characters.
          </p>
          <form className="mt-6 space-y-3" onSubmit={onReset}>
            <ValidField label="New password" ok={passOk} error={password && !passOk ? "At least 8 characters" : null}>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldInput}
              />
            </ValidField>
            <Button type="submit" className="w-full" disabled={busy || !liveBackendEnabled()} loading={busy}>
              Save password
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-[12px] text-mute">
        <Link href="/start?tab=signin" className="text-accent">
          Sign in
        </Link>
        {" · "}
        <Link href="/privacy" className="text-accent">
          Privacy
        </Link>
      </p>
    </div>
  );
}
