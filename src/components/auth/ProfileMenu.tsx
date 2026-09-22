import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  CalendarDays,
  Cat,
  Images,
  Languages,
  LogIn,
  LogOut,
  PencilLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { createSubmitGuard } from "@/lib/submit-guard";
import { useClub } from "@/contexts/ClubContext";
import { useEvents } from "@/contexts/EventsContext";
import { AvatarFace } from "@/components/auth/MeAvatar";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import {
  AVAILABILITY_STATUSES,
  bioKindLabel,
  resolveStatusPicks,
  type AvailabilityStatus,
} from "@shared/bio";
import { toast } from "sonner";
import { NAMES } from "@shared/names";
import { partnerAccountPath } from "@/lib/partner-account";
import { cn } from "@/lib/cn";

function Row({
  icon: Icon,
  label,
  hint,
  highlight = false,
  danger = false,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  hint?: string;
  highlight?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-xl px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        highlight
          ? "bg-brand/10 text-brand hover:bg-brand/15"
          : danger
            ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
            : "hover:bg-paper",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1",
          highlight
            ? "bg-brand text-white ring-transparent"
            : danger
              ? "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400"
              : "bg-paper text-ink ring-line",
        )}
      >
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-medium", highlight && "font-semibold text-brand")}>
          {label}
        </span>
        {hint && <span className="block truncate text-[12px] text-mute">{hint}</span>}
      </span>
    </button>
  );
}

export function ProfileMenu() {
  const [, nav] = useLocation();
  const { user, isAdmin, isHost, logout } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { memberByEmail } = useClub();
  const { myEvent } = useEvents();
  const [open, setOpen] = useState(false);
  // Inline status editor lives inside the dropdown (not a separate modal).
  const [statusEditing, setStatusEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<AvailabilityStatus>("available");
  const [editText, setEditText] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const statusGuard = useRef(createSubmitGuard());
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const clubMember = user?.email ? Boolean(memberByEmail(user.email)) : false;

  const currentStatusKey: AvailabilityStatus =
    mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");
  const statusInfo = AVAILABILITY_STATUSES[currentStatusKey] || AVAILABILITY_STATUSES.available;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    // Move focus into the menu for keyboard users.
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    setStatusEditing(false);
    triggerRef.current?.focus();
    nav(href);
  }

  function openStatusEditor() {
    if (!mine) return;
    const picks = resolveStatusPicks({
      status: mine.availabilityStatus || (mine.openNow ? "available" : "offline"),
      customStatus: mine.customStatus,
      emoji: mine.customStatusEmoji,
    });
    setEditStatus(picks.status);
    setEditText(picks.customText);
    setStatusEditing(true);
  }

  async function saveStatus(clear = false) {
    if (!mine || !statusGuard.current.tryAcquire()) return;
    setStatusSaving(true);
    try {
      await updateProfile({
        handle: mine.handle,
        availabilityStatus: clear ? "available" : editStatus,
        openNow: clear ? true : editStatus === "available",
        customStatus: clear ? undefined : editText.trim() || undefined,
        customStatusEmoji: clear ? undefined : mine.customStatusEmoji,
      });
      toast.success(clear ? "Status cleared" : "Status updated!");
      setStatusEditing(false);
    } catch (err) {
      statusGuard.current.release();
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") || []);
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.findIndex((el) => el === active);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (items[idx < 0 ? 0 : (idx + 1) % items.length] as HTMLButtonElement).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (items[idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length] as HTMLButtonElement).focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  const items: ReactNode = user ? (
    <>
      <div className="px-2.5 pb-2 pt-1.5">
        <div className="flex items-center gap-3">
          <span className="rounded-full ring-2 ring-brand ring-offset-2 ring-offset-card shadow-none">
            <AvatarFace className="h-11 w-11 shrink-0 text-base" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.displayName || mine?.name || "Account"}</p>
            <p className="truncate text-[12px] text-mute">{user.email || user.phone}</p>
            {(mine || business) && (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-gold">
                {[mine && bioKindLabel(mine.kind), business && bioKindLabel(business.kind ?? "business")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          {mine ? (
            <button
              type="button"
              aria-expanded={statusEditing}
              onClick={() => (statusEditing ? setStatusEditing(false) : openStatusEditor())}
              className={cn(
                "flex-1 flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition hover:brightness-95 active:scale-[0.98]",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              <div className="flex min-w-0 items-center gap-2 truncate">
                <span className="truncate text-[11px] font-semibold">
                  {statusInfo.label}
                  {mine.customStatus
                    ? ` · ${mine.customStatusEmoji ? `${mine.customStatusEmoji} ` : ""}${mine.customStatus}`
                    : ""}
                </span>
              </div>
              <span className="ml-1 shrink-0 text-[10px] font-bold uppercase text-ink/60">
                {statusEditing ? "Done" : "Edit"}
              </span>
            </button>
          ) : (
            <div
              className={cn(
                "flex-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              {statusInfo.label}
            </div>
          )}
        </div>

        {/* Inline status editor — lives inside the menubar window, not a modal */}
        {statusEditing && mine && (
          <div className="mt-2 rounded-xl bg-paper/60 p-2 ring-1 ring-line" onKeyDown={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Availability">
              {(Object.keys(AVAILABILITY_STATUSES) as AvailabilityStatus[]).map((key) => {
                const info = AVAILABILITY_STATUSES[key];
                const selected = editStatus === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setEditStatus(key)}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-xl px-2 text-left ring-1 transition active:scale-[0.98]",
                      selected ? "bg-card font-semibold ring-brand" : "bg-card/50 ring-line",
                    )}
                  >
                    <span className={cn("h-3 w-3 shrink-0 rounded-full", info.dotColor)} />
                    <span className="truncate text-[12px]">{info.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex h-10 items-center gap-1.5 rounded-xl bg-card px-2.5 ring-1 ring-line">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Status message…"
                maxLength={60}
                aria-label="Status message"
                className="h-full flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-mute"
              />
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => void saveStatus(true)}
                disabled={statusSaving}
                className="h-9 flex-1 rounded-full text-[12px] font-semibold text-mute transition hover:text-ink disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void saveStatus(false)}
                disabled={statusSaving}
                className="h-9 flex-1 rounded-full bg-brand text-[12px] font-semibold text-white transition hover:bg-brand-ink active:scale-[0.98] disabled:opacity-50"
              >
                {statusSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Language selector in the profile menu */}
        <div
          id="profile-menu-language-selector"
          className="mt-2.5 flex items-center justify-between rounded-xl border border-line/80 bg-paper/60 px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-mute">
            <Languages size={15} className="text-gold shrink-0" />
            <span>Language</span>
          </div>
          <LanguageSwitch size="sm" />
        </div>
      </div>

      <div className="my-1 h-px bg-line" />
      <Row icon={Users} label="Circle" hint="Family, friends, people nearby" highlight onClick={() => go("/circle")} />
      <Row icon={CalendarDays} label="Plans" hint="Make a plan with your people" onClick={() => go("/plan")} />
      {mine ? (
        <Row
          icon={Sparkles}
          label={`@${mine.handle}`}
          hint="Your public bio — share to network"
          onClick={() => go(`/@${mine.handle}`)}
        />
      ) : biosReady ? (
        <Row
          icon={Sparkles}
          label="Claim @handle"
          hint="So your Circle can find you"
          onClick={() => go("/bio/setup")}
        />
      ) : (
        <Row icon={Sparkles} label="Your @handle" hint="Loading your profile…" onClick={() => go("/me")} />
      )}
      {mine && (
        <Row icon={PencilLine} label="Edit bio" hint="Profile, links, shop, share" onClick={() => go("/bio/edit")} />
      )}
      <Row
        icon={UserRound}
        label="Me"
        hint={mine ? `@${mine.handle}` : "Dashboard, zoo, workspaces"}
        onClick={() => go("/me")}
      />
      {mine && <Row icon={Cat} label="Air Zoo" hint="Stickers, shops, hunts" onClick={() => go("/me/zoo")} />}
      <Row icon={Images} label="Memory Wall" hint="Keepsakes & moments" onClick={() => go("/me/memories")} />

      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Workspaces</p>
      {isHost ? (
        <Row icon={Building2} label="Host Workspace" hint="Hotel, venue, campus" onClick={() => go("/host")} />
      ) : (
        <Row icon={Building2} label="Stay host" hint="Hotel, hostel, or room concierge" onClick={() => go("/join")} />
      )}

      {business ? (
        <>
          <Row icon={Store} label="Your place" hint={`AirPal.Me/@${business.handle}`} onClick={() => go("/business")} />
          <Row
            icon={PencilLine}
            label="Edit place"
            hint="Listing, hours, Google import"
            onClick={() => go("/business")}
          />
        </>
      ) : (
        <Row
          icon={Store}
          label={NAMES.partnerAccount}
          hint="Same login. Guests find you on What's on"
          onClick={() => go(partnerAccountPath({ signedIn: true, hasPlace: false }))}
        />
      )}

      {myEvent ? (
        <Row icon={CalendarDays} label="Event Manager" hint={myEvent.name} onClick={() => go("/event")} />
      ) : (
        <Row icon={CalendarDays} label="Run an Event" hint="Market, festival, expo" onClick={() => go("/event")} />
      )}

      {clubMember && <Row icon={Users} label="AirPal Club" hint="Guest list & perks" onClick={() => go("/club")} />}

      <div className="my-1 h-px bg-line" />
      <Row icon={Settings} label="Settings" hint="Email, password" onClick={() => go("/settings")} />
      {isAdmin && <Row icon={ShieldCheck} label="Admin" hint="Platform controls" onClick={() => go("/admin")} />}

      <div className="my-1 h-px bg-line" />
      <Row
        icon={LogOut}
        label="Sign out"
        danger
        onClick={() => {
          setOpen(false);
          void logout().then(() => nav("/"));
        }}
      />
    </>
  ) : (
    <>
      <div className="px-2.5 pb-2 pt-1">
        <p className="text-xs font-semibold text-ink">Welcome to AirPal</p>
        <p className="text-[11px] text-mute">Sign in to start a Circle, make plans, and list a place.</p>

        {/* Language selector under welcome header */}
        <div
          id="profile-menu-guest-language-selector"
          className="mt-2.5 flex items-center justify-between rounded-xl border border-line/80 bg-paper/60 px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-mute">
            <Languages size={15} className="text-gold shrink-0" />
            <span>Language</span>
          </div>
          <LanguageSwitch size="sm" />
        </div>
      </div>

      <Row
        icon={LogIn}
        label="Sign in / Create account"
        hint="Email & password or mobile SMS"
        highlight
        onClick={() => go("/start")}
      />

      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Get started</p>
      <Row
        icon={Users}
        label="Start your Circle"
        hint="Family, friends, people nearby"
        highlight
        onClick={() => go("/circle")}
      />
      <Row
        icon={Store}
        label={NAMES.partnerAccount}
        hint="Same login. Guests find your place"
        onClick={() => go(partnerAccountPath({ signedIn: false, hasPlace: false }))}
      />
      <Row icon={Building2} label="Become a Host" hint="Hotel, venue, hostel, campus" onClick={() => go("/join")} />
      <Row icon={CalendarDays} label="Organise an Event" hint="Market, expo, festival" onClick={() => go("/join")} />

      <div className="my-1 h-px bg-line" />
      <Row icon={Settings} label="Settings" onClick={() => go("/settings")} />
    </>
  );

  return (
    <div className="relative" ref={box}>
      <button
        ref={triggerRef}
        type="button"
        id="profile-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Account menu, ${statusInfo.label}` : "Menu and sign in"}
        title={user ? `${statusInfo.label}${mine?.customStatus ? ` · ${mine.customStatus}` : ""}` : "Sign in"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid h-9 w-9 shrink-0 touch-manipulation place-items-center overflow-visible rounded-full bg-paper transition sm:h-10 sm:w-10",
          "hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          open && "ring-2 ring-brand ring-offset-2 ring-offset-paper",
          !open && user && cn(statusInfo.ringClass, "ring-2 ring-offset-2 ring-offset-paper shadow-none"),
          !open && !user && "ring-1 ring-line hover:ring-brand/50",
        )}
      >
        <AvatarFace className="h-9 w-9 text-xs sm:h-10 sm:w-10" />
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-xs lg:hidden"
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={user ? "Account menu" : "Sign in menu"}
            onKeyDown={onMenuKeyDown}
            className="animate-menu-pop absolute right-0 z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-2xl bg-card p-1.5 shadow-xl ring-1 ring-line no-scrollbar"
          >
            {items}
          </div>
        </>
      )}

    </div>
  );
}
