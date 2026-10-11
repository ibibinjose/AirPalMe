import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Check,
  MapPin,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { Button } from "@/components/ui/Button";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { BiometricEnrollCard } from "@/components/auth/BiometricEnrollCard";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import { triggerHaptic } from "@/lib/native";
import { getThemePreference, setThemePreference, type ThemeMode } from "@/lib/theme";
import { CITY_OPTIONS } from "@/lib/cities";
import { cn } from "@/lib/cn";

export function SettingsPage() {
  const [, nav] = useLocation();
  const { user, logout, deleteAccount, sendVerificationEmail, requestPasswordReset } = useAuth();
  const { mine, business } = useBio();
  const { city, usingGps, chooseLocation, shareLocation, setShareLocation } = useLocalNow();

  const [resetBusy, setResetBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [theme, setTheme] = useState<ThemeMode>(() => getThemePreference());
  const [notifInvites, setNotifInvites] = useState(() => {
    try {
      return localStorage.getItem("airpal_notif_invites") !== "false";
    } catch {
      return true;
    }
  });
  const [notifDeals, setNotifDeals] = useState(() => {
    try {
      return localStorage.getItem("airpal_notif_deals") !== "false";
    } catch {
      return true;
    }
  });
  const [pushStatus, setPushStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    void triggerHaptic("light");
    setTheme(mode);
    setThemePreference(mode);
    toast.success(`Theme set to ${mode}`);
  };

  const handleInvitesToggle = () => {
    void triggerHaptic("light");
    setNotifInvites((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem("airpal_notif_invites", String(nextVal));
      } catch {
        /* ignore */
      }
      return nextVal;
    });
  };

  const handleDealsToggle = () => {
    void triggerHaptic("light");
    setNotifDeals((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem("airpal_notif_deals", String(nextVal));
      } catch {
        /* ignore */
      }
      return nextVal;
    });
  };

  const requestPush = async () => {
    void triggerHaptic("medium");
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushStatus(perm);
        if (perm === "granted") {
          toast.success("Push notifications enabled");
        } else {
          toast.message("Push notifications not granted");
        }
      } catch {
        toast.error("Could not request notification permission");
      }
    } else {
      toast.message("Push notifications are not supported on this browser");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+6rem))]">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Account</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">Settings</h1>

      {user ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
          <MeAvatar faceClassName="h-14 w-14 text-lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.displayName || "Account"}</p>
            <p className="truncate text-sm text-mute">{user.email || user.phone || "Signed in"}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-mute">Sign in to manage your email, security, and profile settings.</p>
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

      {/* App Appearance / Theme */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Appearance</h2>
        <p className="mt-1 text-xs text-mute">Choose how AirPal looks on this device.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { id: "system" as const, label: "System", icon: Monitor },
            { id: "light" as const, label: "Light", icon: Sun },
            { id: "dark" as const, label: "Dark", icon: Moon },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl p-2.5 text-xs font-semibold ring-1 transition active:scale-95 cursor-pointer",
                  active
                    ? "bg-brand text-white ring-brand shadow-xs"
                    : "bg-card text-ink ring-line hover:bg-paper",
                )}
              >
                <Icon size={16} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Notifications</h2>
        <p className="mt-1 text-xs text-mute">Manage alerts for hangouts, perks, and event updates.</p>
        <div className="mt-3 space-y-2">
          <div className="flex min-h-[52px] items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-medium text-ink">Push Notifications</span>
              <span className="block text-xs text-mute">
                {pushStatus === "granted"
                  ? "Active on this browser"
                  : pushStatus === "denied"
                    ? "Blocked in browser permissions"
                    : "Not enabled yet"}
              </span>
            </div>
            {pushStatus !== "granted" ? (
              <button
                type="button"
                onClick={requestPush}
                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer"
              >
                Enable
              </button>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check size={16} />
              </span>
            )}
          </div>

          <div className="flex min-h-[52px] items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-medium text-ink">Hangout Invites & RSVPs</span>
              <span className="block text-xs text-mute">Alerts when friends invite you to plans</span>
            </div>
            <button
              type="button"
              onClick={handleInvitesToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                notifInvites ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={notifInvites}
              aria-label="Toggle Hangout Invites alerts"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  notifInvites ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <div className="flex min-h-[52px] items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-medium text-ink">Event Drops & Dining Deals</span>
              <span className="block text-xs text-mute">Notice when partner venues post limited perks</span>
            </div>
            <button
              type="button"
              onClick={handleDealsToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                notifDeals ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={notifDeals}
              aria-label="Toggle Event Drops alerts"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  notifDeals ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Location & Precinct Preferences */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Location & Precinct</h2>
        <p className="mt-1 text-xs text-mute">Control your local city discovery anchor.</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-accent" />
                <span className="text-sm font-semibold text-ink">
                  {usingGps ? "Using Device GPS" : `City: ${city || "Sydney"}`}
                </span>
              </div>
              <span className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line">
                {usingGps ? "Live GPS" : "Fixed City"}
              </span>
            </div>
            <div className="mt-3">
              <label htmlFor="city-select" className="block text-[11px] font-bold text-mute uppercase tracking-wider mb-1">
                Default City
              </label>
              <select
                id="city-select"
                value={usingGps ? "gps" : city.toLowerCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  void triggerHaptic("light");
                  if (val === "gps") {
                    chooseLocation({ mode: "gps" });
                    toast.success("Switched to live GPS");
                  } else {
                    const found = CITY_OPTIONS.find((c) => c.label.toLowerCase() === val.toLowerCase());
                    if (found) {
                      chooseLocation({ mode: "city", city: found.label, lat: found.lat, lng: found.lng });
                      toast.success(`Location set to ${found.label}`);
                    }
                  }
                }}
                className="w-full min-h-[44px] rounded-xl bg-paper px-3 py-2 text-sm font-medium text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="gps">📍 Current device location (GPS)</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.label.toLowerCase()}>
                    {c.label} ({c.region})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex min-h-[52px] items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-medium text-ink">Share Location with Circle</span>
              <span className="block text-xs text-mute">Allow friends in active hangouts to view your check-in</span>
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setShareLocation(!shareLocation);
              }}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                shareLocation ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={shareLocation}
              aria-label="Toggle location sharing"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  shareLocation ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Workspaces Section */}
      <h2 className="font-display mt-8 text-xl font-bold">Workspace</h2>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/me")}
        >
          <span>
            <span className="block text-[12px] text-mute">Digital Bio</span>
            <span className="font-medium text-ink">{mine ? `@${mine.handle}` : "Your digital bio profile"}</span>
          </span>
          <span className="text-sm font-semibold text-accent">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/host")}
        >
          <span>
            <span className="block text-[12px] text-mute">Host Console</span>
            <span className="font-medium text-ink">Belonging Reports & PBSA Arrival Engine</span>
          </span>
          <span className="text-sm font-semibold text-accent">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }))}
        >
          <span>
            <span className="block text-[12px] text-mute">{NAMES.partnerAccount}</span>
            <span className="font-medium text-ink">{business ? `@${business.handle}` : "Local venue, dining perks & counter QR"}</span>
          </span>
          <span className="text-sm font-semibold text-accent">Open</span>
        </button>
        <button
          type="button"
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-paper active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => nav("/event")}
        >
          <span>
            <span className="block text-[12px] text-mute">Event Organiser</span>
            <span className="font-medium text-ink">Concert, festival & door scanner</span>
          </span>
          <span className="text-sm font-semibold text-accent">Open</span>
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
            className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 py-2 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card active:scale-95 transition"
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
            className="mt-3 w-full rounded-2xl border border-line bg-card px-4 py-3 text-[16px] sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <button
            type="button"
            disabled={deleteBusy || deleteConfirm !== "DELETE"}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-rose-500/10 px-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-500/20 transition hover:bg-rose-500/15 disabled:opacity-40 active:scale-95 cursor-pointer"
            onClick={() => {
              void triggerHaptic("error");
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
