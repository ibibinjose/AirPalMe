import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  CalendarDays,
  Cat,
  ChevronDown,
  HeartHandshake,
  Languages,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useClub } from "@/contexts/ClubContext";
import { useEvents } from "@/contexts/EventsContext";
import { AvatarFace } from "@/components/auth/MeAvatar";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@shared/bio";
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
  const { mine, business } = useBio();
  const { memberByEmail } = useClub();
  const { myEvent } = useEvents();
  const [open, setOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const clubMember = user?.email ? Boolean(memberByEmail(user.email)) : false;

  const currentStatusKey: AvailabilityStatus = mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");
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
    triggerRef.current?.focus();
    nav(href);
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
          <AvatarFace className="h-11 w-11 shrink-0 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.displayName || mine?.name || "Account"}</p>
            <p className="truncate text-[12px] text-mute">{user.email || user.phone}</p>
          </div>
        </div>

        {/* Live Availability Status Pill & Quick Switcher */}
        {mine && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatusModalOpen(true);
              }}
              className={cn(
                "flex-1 flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition hover:brightness-95 active:scale-[0.98]",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className={cn("h-2 w-2 rounded-full shrink-0", statusInfo.dotColor)} />
                <span className="text-[11px] font-semibold truncate">
                  {statusInfo.label}
                  {mine.customStatus ? ` · ${mine.customStatusEmoji ? `${mine.customStatusEmoji} ` : ""}${mine.customStatus}` : ""}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-ink/60 shrink-0 ml-1">Edit</span>
            </button>
          </div>
        )}

        {/* Language selector under profile / burger menu */}
        <div id="profile-menu-language-selector" className="mt-2.5 flex items-center justify-between rounded-xl border border-line/80 bg-paper/60 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-mute">
            <Languages size={15} className="text-gold shrink-0" />
            <span>Language</span>
          </div>
          <LanguageSwitch size="sm" />
        </div>
      </div>

      <div className="my-1 h-px bg-line" />
      {mine && (
        <Row
          icon={Sparkles}
          label="Quick Bio"
          hint={`airpal.me/@${mine.handle}`}
          highlight
          onClick={() => go(`/@${mine.handle}`)}
        />
      )}
      {mine && <Row icon={UserRound} label="Profile" hint={`@${mine.handle}`} onClick={() => go("/me")} />}
      <Row icon={Users} label="Circle" hint="Met, following, likes you" onClick={() => go("/circle")} />
      {mine && <Row icon={Cat} label="Air Zoo" hint="Stickers, shops, hunts" onClick={() => go("/me/zoo")} />}
      <Row icon={HeartHandshake} label="Become an AirPal" hint="Friend, teammate, companion" onClick={() => go("/companion")} />

      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Workspaces</p>
      {isHost ? (
        <Row icon={Building2} label="Host Workspace" hint="Hotel, venue, campus" onClick={() => go("/host")} />
      ) : (
        <Row icon={Building2} label="Become a Host" hint="List a hotel, venue, or stay" onClick={() => go("/join")} />
      )}

      {business ? (
        <Row icon={Store} label="Business Place" hint={`@${business.handle}`} onClick={() => go("/business")} />
      ) : (
        <Row
          icon={Store}
          label="List a Business"
          hint="Café, shop, local perks"
          onClick={() => go("/bio/setup?kind=business")}
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
        <p className="text-[11px] text-mute">Sign in for saved stays, @handle & club perks.</p>

        {/* Language selector under welcome header */}
        <div id="profile-menu-guest-language-selector" className="mt-2.5 flex items-center justify-between rounded-xl border border-line/80 bg-paper/60 px-2.5 py-1.5">
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
      <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Partners & Creators</p>
      <Row icon={HeartHandshake} label="Become an AirPal" hint="Join the companion waitlist" onClick={() => go("/companion")} />
      <Row icon={Building2} label="Become a Host" hint="Hotel, venue, hostel, campus" onClick={() => go("/join")} />
      <Row icon={Store} label="List a Business" hint="Café, shop, local deals" onClick={() => go("/join")} />
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
        aria-label={user ? "Account and menu" : "Menu and sign in"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 sm:h-10 touch-manipulation items-center gap-1.5 overflow-visible rounded-full border border-line/80 bg-paper py-0.5 pl-2.5 pr-1.5 transition hover:border-brand/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          open && "ring-2 ring-brand ring-offset-2 ring-offset-paper",
        )}
      >
        <Menu size={16} className="text-mute shrink-0" aria-hidden="true" />
        <AvatarFace className="h-7 w-7 text-xs sm:h-8 sm:w-8" />
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={cn("shrink-0 text-mute/80 transition-transform -ml-0.5", open && "rotate-180")}
        />
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

      {mine && (
        <BioStatusModal
          open={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          handle={mine.handle}
          currentStatus={mine.availabilityStatus || (mine.openNow ? "available" : "offline")}
          currentCustomStatus={mine.customStatus}
          currentEmoji={mine.customStatusEmoji}
        />
      )}
    </div>
  );
}
