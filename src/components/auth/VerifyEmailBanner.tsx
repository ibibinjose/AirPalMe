import { useState } from "react";
import { toast } from "sonner";
import { authErrorMessage } from "@shared/auth-email";

export function VerifyEmailBanner({ email, onSend }: { email?: string; onSend: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  if (!email) return null;

  async function send() {
    setBusy(true);
    try {
      await onSend();
      toast.success("Verification email sent");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not send"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
      <p className="text-sm font-medium">Confirm {email}</p>
      <p className="mt-1 text-[13px] text-mute">We sent a link. It can take a minute. Check spam too.</p>
      <button
        type="button"
        className="mt-2 text-sm text-brand disabled:opacity-50"
        disabled={busy}
        onClick={() => void send()}
      >
        {busy ? "Sending…" : "Resend email"}
      </button>
    </div>
  );
}
