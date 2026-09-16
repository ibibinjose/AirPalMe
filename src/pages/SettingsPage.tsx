import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { authErrorMessage } from "@shared/auth-email";
import { Button } from "@/components/ui/Button";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";

export function SettingsPage() {
  const [, nav] = useLocation();
  const { user, logout, sendVerificationEmail, requestPasswordReset } = useAuth();
  const { mine, business } = useBio();
  const [resetBusy, setResetBusy] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Account</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">Settings</h1>

      {user ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <MeAvatar faceClassName="h-14 w-14 text-lg" statusClass="h-3 w-3" />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.displayName || "Account"}</p>
            <p className="truncate text-sm text-mute">{user.displayName ? "Signed in" : "Account"}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-mute">Sign in to manage email, password, and your @handle.</p>
      )}

      {user && <AccountContacts />}
      {user?.email && user.emailVerified === false && (
        <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
      )}

      <h2 className="font-display mt-8 text-xl">Workspace</h2>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
          onClick={() => nav("/me")}
        >
          <span>
            <span className="block text-[12px] text-mute">Profile</span>
            <span className="font-medium">{mine ? `@${mine.handle}` : "Your list"}</span>
          </span>
          <span className="text-sm text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
          onClick={() => nav("/host")}
        >
          <span>
            <span className="block text-[12px] text-mute">Host</span>
            <span className="font-medium">Hotel, venue, hostel, campus</span>
          </span>
          <span className="text-sm text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
          onClick={() => nav("/business")}
        >
          <span>
            <span className="block text-[12px] text-mute">Business</span>
            <span className="font-medium">{business ? `@${business.handle}` : "Local listing"}</span>
          </span>
          <span className="text-sm text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
          onClick={() => nav("/event")}
        >
          <span>
            <span className="block text-[12px] text-mute">Event</span>
            <span className="font-medium">Market, expo, festival</span>
          </span>
          <span className="text-sm text-brand">Open</span>
        </button>
      </div>

      {user?.email && (
        <>
          <h2 className="font-display mt-8 text-xl">Security</h2>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl bg-card px-4 py-3 text-left text-sm ring-1 ring-line disabled:opacity-50"
            disabled={resetBusy}
            onClick={() => {
              if (!user.email) {
                toast.message("Add an email to reset a password. Mobile login uses a text code.");
                return;
              }
              setResetBusy(true);
              void requestPasswordReset(user.email)
                .then(() => toast.success("Reset link sent to your email"))
                .catch((err) => toast.error(authErrorMessage(err, "Could not send reset email")))
                .finally(() => setResetBusy(false));
            }}
          >
            {resetBusy ? "Sending…" : "Email a password reset"}
          </button>
        </>
      )}

      <h2 className="font-display mt-8 text-xl">Legal</h2>
      <p className="mt-3 text-sm text-mute">
        <Link href="/privacy" className="text-brand">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="text-brand">
          Terms
        </Link>
        {" · "}
        <Link href="/cookies" className="text-brand">
          Cookies
        </Link>
        {" · "}
        <Link href="/contact" className="text-brand">
          Contact
        </Link>
      </p>

      {user ? (
        <button type="button" className="mt-8 text-sm text-mute" onClick={() => void logout().then(() => nav("/"))}>
          Sign out
        </button>
      ) : (
        <div className="mt-8 space-y-2">
          <Button className="w-full" onClick={() => nav("/start")}>
            Join
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => nav("/start?tab=signin")}>
            Sign in
          </Button>
        </div>
      )}
    </div>
  );
}
