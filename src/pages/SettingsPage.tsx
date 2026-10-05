import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { authErrorMessage } from "@shared/auth-email";
import { Button } from "@/components/ui/Button";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { BiometricEnrollCard } from "@/components/auth/BiometricEnrollCard";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";

export function SettingsPage() {
  const [, nav] = useLocation();
  const { user, logout, deleteAccount, sendVerificationEmail, requestPasswordReset } = useAuth();
  const { mine, business } = useBio();
  const [resetBusy, setResetBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Account</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">Settings</h1>

      {user ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <MeAvatar faceClassName="h-14 w-14 text-lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.displayName || "Account"}</p>
            <p className="truncate text-sm text-mute">{user.displayName ? "Signed in" : "Account"}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-mute">Sign in to manage email, password, and your @handle.</p>
      )}

      {user && <AccountContacts />}
      {user && mine && (
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
          <ChangeHandleForm current={mine.handle} profileId={mine.id} />
        </div>
      )}
      {user?.email && user.emailVerified === false && (
        <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
      )}

      <h2 className="font-display mt-8 text-xl font-bold">Workspace</h2>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/me")}
        >
          <span>
            <span className="block text-[12px] text-mute">Profile</span>
            <span className="font-medium text-ink">{mine ? `@${mine.handle}` : "Your list"}</span>
          </span>
          <span className="text-sm font-semibold text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/host")}
        >
          <span>
            <span className="block text-[12px] text-mute">Host</span>
            <span className="font-medium text-ink">Hotel, venue, hostel, campus</span>
          </span>
          <span className="text-sm font-semibold text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }))}
        >
          <span>
            <span className="block text-[12px] text-mute">{NAMES.partnerAccount}</span>
            <span className="font-medium text-ink">{business ? `@${business.handle}` : "Same login. Guests find your place"}</span>
          </span>
          <span className="text-sm font-semibold text-brand">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/event")}
        >
          <span>
            <span className="block text-[12px] text-mute">Event</span>
            <span className="font-medium text-ink">Market, expo, festival</span>
          </span>
          <span className="text-sm font-semibold text-brand">Open</span>
        </button>
      </div>

      {user && (
        <>
          <h2 className="font-display mt-8 text-xl font-bold">Security & Biometrics</h2>
          <BiometricEnrollCard />
          {user.email && (
            <button
              type="button"
              className="mt-3 flex min-h-[48px] w-full cursor-pointer items-center rounded-2xl bg-card px-4 py-3 text-left text-sm font-medium ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
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
          )}
        </>
      )}

      <h2 className="font-display mt-8 text-xl font-bold">Legal</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-mute">
        {[
          { href: "/privacy", label: "Privacy" },
          { href: "/terms", label: "Terms" },
          { href: "/cookies", label: "Cookies" },
          { href: "/contact", label: "Contact" },
          { href: "/help", label: "Help" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-[38px] items-center rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-brand ring-1 ring-line hover:bg-card active:scale-95"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {user ? (
        <>
          <button
            type="button"
            className="mt-8 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
            onClick={() => void logout().then(() => nav("/"))}
          >
            Sign out
          </button>
          <h2 className="font-display mt-10 text-xl text-rose-700">Delete account</h2>
          <p className="mt-2 text-sm text-mute">
            This signs you out and removes your login. Type DELETE to confirm. We keep a deletion record for 30 days so
            we can finish clearing bookings and reports.
          </p>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            autoComplete="off"
            className="mt-3 w-full rounded-2xl border border-line bg-card px-4 py-3 text-sm"
          />
          <button
            type="button"
            disabled={deleteBusy || deleteConfirm !== "DELETE"}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-rose-500/10 px-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-500/20 transition hover:bg-rose-500/15 disabled:opacity-40"
            onClick={() => {
              setDeleteBusy(true);
              void deleteAccount()
                .then(() => {
                  toast.success("Account deleted");
                  nav("/");
                })
                .catch((err) => toast.error(authErrorMessage(err, "Could not delete account")))
                .finally(() => setDeleteBusy(false));
            }}
          >
            {deleteBusy ? "Deleting…" : "Delete my account"}
          </button>
        </>
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
