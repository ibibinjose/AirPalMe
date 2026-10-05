import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronRight,
  Compass,
  Headphones,
  Images,
  Info,
  Languages,
  LogIn,
  LogOut,
  PencilLine,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { createSubmitGuard } from "@/lib/submit-guard";
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
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

const EMOJI_SHORTCUTS = ["☕", "💻", "🍸", "🚶", "⚡", "✈️", "🎧", "🌴"];

function Row({
  icon: Icon,
  label,
  hint,
  highlight = false,
  danger = false,
  badge,
  badgeColor,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  hint?: string;
  highlight?: boolean;
  danger?: boolean;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        void triggerHaptic("light");
        onClick();
      }}
      className={cn(
        "group flex min-h-[46px] w-full touch-manipulation items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]",
        highlight
          ? "bg-brand/10 text-brand hover:bg-brand/15 font-semibold"
          : danger
            ? "text-red-600 hover:bg-red-500/10 dark:text-red-400 font-medium"
            : "text-ink hover:bg-paper/80 font-medium",
      )}
    >
      <span
        className={cn(
          "grid h-8.5 w-8.5 shrink-0 place-items-center rounded-xl transition-transform duration-150 group-hover:scale-105 ring-1",
          highlight
            ? "bg-brand text-white ring-brand/30 shadow-2xs"
            : danger
              ? "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400"
              : "bg-paper text-ink/80 ring-line/80 group-hover:bg-card group-hover:text-brand",
        )}
      >
        <Icon size={16} strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("block truncate text-xs sm:text-[13px]", highlight && "font-bold text-brand")}>
            {label}
          </span>
          {badge && (
            <span
              className={cn(
                "rounded-full px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider",
                badgeColor || "bg-brand/10 text-brand",
              )}
            >
              {badge}
            </span>
          )}
        </span>
        {hint && <span className="block truncate text-[11px] text-mute group-hover:text-mute/90">{hint}</span>}
      </span>

      <ChevronRight
        size={14}
        className={cn(
          "shrink-0 opacity-40 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5",
          highlight ? "text-brand" : danger ? "text-red-500" : "text-mute",
        )}
      />
    </button>
  );
}

export function ProfileMenu() {
  const [, nav] = useLocation();
  const { user, isAdmin, isHost, logout } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { myEvent } = useEvents();
  const [open, setOpen] = useState(false);
  // Inline status editor lives inside the dropdown / drawer.
  const [statusEditing, setStatusEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<AvailabilityStatus>("available");
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState("☕");
  const [statusSaving, setStatusSaving] = useState(false);
  const statusGuard = useRef(createSubmitGuard());
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useScrollLock(open);

  const currentStatusKey: AvailabilityStatus =
    mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");
  const statusInfo = AVAILABILITY_STATUSES[currentStatusKey] || AVAILABILITY_STATUSES.available;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (
        !box.current?.contains(e.target as Node) &&
        !drawerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
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
    setEditEmoji(picks.emoji || "☕");
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
        customStatusEmoji: clear ? undefined : editEmoji || mine.customStatusEmoji,
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
    const activeRef = menuRef.current || drawerRef.current;
    const items = Array.from(activeRef?.querySelectorAll<HTMLButtonElement>("button") || []);
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
      {/* Identity Card Header */}
      <div className="rounded-2xl bg-paper/70 p-3 ring-1 ring-line/80 shadow-2xs">
        <div
          onClick={() => (mine ? go(`/@${mine.handle}`) : go("/me"))}
          className="group/card flex items-center gap-3 cursor-pointer rounded-xl p-1 -m-1 transition hover:bg-card/70"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (mine) {
                go(`/@${mine.handle}`);
              } else {
                go("/me");
              }
            }
          }}
          aria-label={mine ? `View @${mine.handle} profile` : "View your profile"}
        >
          <div className="relative shrink-0">
            <AvatarFace
              className="h-12 w-12 text-base transition-transform group-hover/card:scale-105"
              showRing
            />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card shadow-xs",
                currentStatusKey === "available" ? "bg-emerald-500" : currentStatusKey === "busy" ? "bg-amber-500" : "bg-zinc-400",
              )}
              title={statusInfo.label}
            >
              {currentStatusKey === "available" && (
                <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="font-display truncate text-sm font-bold text-ink group-hover/card:text-brand transition-colors">
                {user.displayName || mine?.name || "Account"}
              </p>
              <span className="text-[10px] font-semibold text-mute group-hover/card:text-brand flex items-center gap-0.5 shrink-0">
                <span>View</span>
                <ChevronRight size={12} />
              </span>
            </div>
            {mine ? (
              <p className="truncate text-xs font-semibold text-brand">@{mine.handle}</p>
            ) : (
              <p className="truncate text-[11px] text-mute">{user.email || user.phone}</p>
            )}
            {(mine || business) && (
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-gold">
                {[
                  mine && bioKindLabel(mine.kind),
                  business && bioKindLabel(business.kind ?? "business"),
                  mine?.starTier && `★ ${mine.starTier}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Availability Status Pill */}
        <div className="mt-2.5">
          {mine ? (
            <button
              type="button"
              aria-expanded={statusEditing}
              onClick={() => (statusEditing ? setStatusEditing(false) : openStatusEditor())}
              className={cn(
                "w-full flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition-all duration-150 hover:brightness-95 active:scale-[0.98] shadow-2xs",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-current shrink-0" />
                <span className="truncate">
                  {mine.customStatus ? (
                    <span className="font-bold text-ink">
                      {mine.customStatusEmoji && `${mine.customStatusEmoji} `}
                      {mine.customStatus}
                    </span>
                  ) : (
                    <span>{statusInfo.label}</span>
                  )}
                </span>
              </div>
              <span className="ml-1 shrink-0 text-[10px] font-bold uppercase text-ink/70">
                {statusEditing ? "Close" : "Edit"}
              </span>
            </button>
          ) : (
            <div
              className={cn(
                "w-full rounded-xl border px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current shrink-0" />
              <span>{statusInfo.label}</span>
            </div>
          )}
        </div>

        {/* Inline Status Editor */}
        {statusEditing && mine && (
          <div className="mt-2.5 rounded-2xl bg-card p-3 ring-1 ring-line/80 shadow-xs animate-in fade-in zoom-in-95 duration-150" onKeyDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Set Status</span>
              <button
                type="button"
                onClick={() => setStatusEditing(false)}
                className="text-mute hover:text-ink text-xs p-1"
                aria-label="Close status editor"
              >
                <X size={14} />
              </button>
            </div>

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
                      "flex h-9 items-center gap-2 rounded-xl px-2 text-left ring-1 transition active:scale-[0.98]",
                      selected ? "bg-paper font-bold ring-brand text-brand shadow-2xs" : "bg-card ring-line/70 text-ink/80 hover:bg-paper/50",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", info.dotColor)} />
                    <span className="truncate text-xs">{info.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Emoji Shortcuts */}
            <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              {EMOJI_SHORTCUTS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setEditEmoji(emo)}
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm transition active:scale-95",
                    editEmoji === emo ? "bg-brand/10 ring-1 ring-brand" : "hover:bg-paper",
                  )}
                >
                  {emo}
                </button>
              ))}
            </div>

            <div className="mt-1 flex h-9 items-center gap-2 rounded-xl bg-paper/70 px-2.5 ring-1 ring-line/80">
              <span className="text-sm shrink-0">{editEmoji}</span>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="What's your focus today?"
                maxLength={60}
                aria-label="Status message"
                className="h-full flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-mute"
              />
            </div>

            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => void saveStatus(true)}
                disabled={statusSaving}
                className="h-8 flex-1 rounded-xl text-xs font-semibold text-mute hover:text-ink transition hover:bg-paper disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void saveStatus(false)}
                disabled={statusSaving}
                className="h-8 flex-1 rounded-xl bg-brand text-xs font-semibold text-white transition hover:bg-brand-ink active:scale-[0.98] disabled:opacity-50 shadow-2xs"
              >
                {statusSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Language Switch */}
        <div
          id="profile-menu-language-selector"
          className="mt-2.5 flex items-center justify-between rounded-xl border border-line/80 bg-card/60 px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-mute">
            <Languages size={14} className="text-gold shrink-0" />
            <span>Language</span>
          </div>
          <LanguageSwitch size="sm" />
        </div>
      </div>

      {/* Social & Discovery Hubs */}
      <div className="mt-2 space-y-0.5">
        <Row
          icon={Compass}
          label="What now?"
          hint="One suggestion, then a plan"
          badge="Now"
          highlight
          onClick={() => go("/now")}
        />
        <Row icon={CalendarDays} label="Plans & Invites" hint="Group plans, RSVPs & meetups" onClick={() => go("/plan")} />
        {mine ? (
          <Row
            icon={Sparkles}
            label={`@${mine.handle}`}
            hint="Your public bio link"
            onClick={() => go(`/@${mine.handle}`)}
          />
        ) : biosReady ? (
          <Row
            icon={Sparkles}
            label="Claim @handle"
            hint="Reserve your unique AirPal handle"
            highlight
            onClick={() => go("/bio/setup")}
          />
        ) : (
          <Row icon={Sparkles} label="Your @handle" hint="Loading your profile…" onClick={() => go("/me")} />
        )}
        {mine && (
          <Row icon={PencilLine} label="Edit Bio" hint="Profile, links, shop & share" onClick={() => go("/bio/edit")} />
        )}
      </div>

      {/* Workspaces & Pulse Hub */}
      <div className="my-1.5 h-px bg-line/80" />
      <p className="px-3 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Workspaces & Business</p>
      <div className="mt-1 space-y-0.5">
        <Row
          icon={Activity}
          label="AirPal Pulse"
          hint="Instant venue feedback & QR codes"
          badge="NEW"
          badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          onClick={() => go("/pulse")}
        />

        <Row
          icon={Headphones}
          label="Help Desk Operations"
          hint="Front desk, kitchen & event support"
          badge="LIVE"
          badgeColor="bg-brand/15 text-brand"
          onClick={() => go("/helpdesk")}
        />

        {isHost ? (
          <Row icon={Building2} label="Host Workspace" hint="Hotel, venue, campus" onClick={() => go("/host")} />
        ) : (
          <Row icon={Building2} label="Stay Host" hint="Hotel, hostel, or room concierge" onClick={() => go("/join")} />
        )}

        {business ? (
          <Row
            icon={Store}
            label="Your Place"
            hint={`AirPal.Me/@${business.handle} · Listing, hours & promotions`}
            onClick={() => go("/business")}
          />
        ) : (
          <Row
            icon={Store}
            label={NAMES.partnerAccount}
            hint="Listing, promotions & guest discovery"
            onClick={() => go(partnerAccountPath({ signedIn: true, hasPlace: false }))}
          />
        )}

        <Row
          icon={CalendarDays}
          label={myEvent ? "Event Manager" : "Run an Event"}
          hint={myEvent ? myEvent.name : "Market, festival, expo"}
          onClick={() => go("/event")}
        />

      </div>

      {/* Personal & Tools */}
      <div className="my-1.5 h-px bg-line/80" />
      <p className="px-3 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Personal & Tools</p>
      <div className="mt-1 space-y-0.5">
        <Row
          icon={UserRound}
          label="Me Dashboard"
          hint={mine ? `@${mine.handle}` : "Profile, zoo, stats"}
          onClick={() => go("/me")}
        />
        <Row icon={Ticket} label="My Tickets" hint="Passes & reservations" onClick={() => go("/me/tickets")} />
        <Row icon={Images} label="Memory Wall" hint="Keepsakes & moments" onClick={() => go("/me/memories")} />
        <Row icon={QrCode} label="Scan QR & Wave" hint="Scan marks & interact" onClick={() => go("/scan")} />
      </div>

      {/* Settings & Admin */}
      <div className="my-1.5 h-px bg-line/80" />
      <div className="space-y-0.5">
        <Row icon={Settings} label="Settings" hint="Account, notifications & privacy" onClick={() => go("/settings")} />
        <Row icon={Info} label="About AirPal" hint="Life Made Easy" onClick={() => go("/about")} />
        {isAdmin && <Row icon={ShieldCheck} label="Admin Portal" hint="Platform controls" onClick={() => go("/admin")} />}
        <Row
          icon={LogOut}
          label="Sign out"
          danger
          onClick={() => {
            setOpen(false);
            void logout().then(() => nav("/"));
          }}
        />
      </div>
    </>
  ) : (
    <>
      {/* Guest Welcome Card */}
      <div className="rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs">
        <p className="font-display text-sm font-bold text-ink">Welcome to AirPal</p>
        <p className="mt-0.5 text-xs text-mute leading-relaxed">
          Sign in to start a Circle, find a Mate, make plans, and discover places.
        </p>

        {/* Language selector under welcome header */}
        <div
          id="profile-menu-guest-language-selector"
          className="mt-3 flex items-center justify-between rounded-xl border border-line/80 bg-card/60 px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-mute">
            <Languages size={14} className="text-gold shrink-0" />
            <span>Language</span>
          </div>
          <LanguageSwitch size="sm" />
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <Row
          icon={LogIn}
          label="Sign in / Create account"
          hint="Email & password or mobile SMS"
          highlight
          onClick={() => go("/start")}
        />
      </div>

      <div className="my-1.5 h-px bg-line/80" />
      <p className="px-3 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold">Get started</p>
      <div className="mt-1 space-y-0.5">
        <Row
          icon={Compass}
          label="What now?"
          hint="One suggestion, then a plan"
          highlight
          onClick={() => go("/now")}
        />
        <Row
          icon={Activity}
          label="AirPal Pulse"
          hint="Fast real-time guest/customer feedback"
          badge="NEW"
          badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          onClick={() => go("/pulse")}
        />
        <Row
          icon={Store}
          label={NAMES.partnerAccount}
          hint="Same login. Guests find your place"
          onClick={() => go(partnerAccountPath({ signedIn: false, hasPlace: false }))}
        />
        <Row icon={Building2} label="Become a Host" hint="Hotel, venue, hostel, campus" onClick={() => go("/join")} />
        <Row icon={CalendarDays} label="Organise an Event" hint="Market, expo, festival" onClick={() => go("/join")} />
        <Row icon={QrCode} label="Scan QR & Wave" hint="Scan marks & interact" onClick={() => go("/scan")} />
      </div>

      <div className="my-1.5 h-px bg-line/80" />
      <Row icon={Settings} label="Settings" onClick={() => go("/settings")} />
      <Row icon={Info} label="About AirPal" onClick={() => go("/about")} />
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
        title={user ? `${statusInfo.label}${mine?.customStatus ? ` · ${mine.customStatus}` : ""}` : "Sign in / Menu"}
        onClick={() => {
          void triggerHaptic("light");
          setOpen((v) => !v);
        }}
        className={cn(
          "relative grid h-9 w-9 shrink-0 touch-manipulation place-items-center overflow-visible rounded-full bg-paper transition-all duration-200 sm:h-10 sm:w-10",
          "hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-95",
          open && "ring-2 ring-brand ring-offset-2 ring-offset-paper shadow-sm",
          !open && user && cn(statusInfo.ringClass, "ring-2 ring-offset-2 ring-offset-paper shadow-none"),
          !open && !user && "ring-1 ring-line hover:ring-brand/50",
        )}
      >
        <AvatarFace className="h-9 w-9 text-xs sm:h-10 sm:w-10" />
        {user && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card shadow-2xs",
              currentStatusKey === "available" ? "bg-emerald-500" : currentStatusKey === "busy" ? "bg-amber-500" : "bg-zinc-400",
            )}
          />
        )}
      </button>

      {open && (
        <>
          {/* Mobile / iOS / Android Bottom Sheet Drawer (< lg) using portal */}
          {typeof document !== "undefined" &&
            createPortal(
              <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                <div
                  onClick={() => {
                    void triggerHaptic("light");
                    setOpen(false);
                  }}
                  className="fixed inset-0 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200"
                  aria-hidden="true"
                />
                <div
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={user ? "Account & Navigation menu" : "Menu & Sign in"}
                  onKeyDown={onMenuKeyDown}
                  className="relative z-50 flex max-h-[88dvh] w-full flex-col rounded-t-[32px] bg-card/98 ring-1 ring-line shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-250 ease-out"
                >
                  {/* Drag Pill Handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1.5 w-12 rounded-full bg-line/80" />
                  </div>

                  {/* Mobile Drawer Top Bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-line/60">
                    <span className="font-display text-sm font-bold text-ink">
                      {user ? (mine ? `@${mine.handle}` : "Account & Navigation") : "Menu & Sign In"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        setOpen(false);
                      }}
                      className="grid h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation place-items-center rounded-full text-mute hover:bg-paper hover:text-ink ring-1 ring-line/70 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-95"
                      aria-label="Close menu"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Scrollable Drawer Content */}
                  <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-1 pb-[max(2.5rem,env(safe-area-inset-bottom,16px))] no-scrollbar">
                    {items}
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {/* Desktop Dropdown Menu (lg:block) */}
          <div
            ref={menuRef}
            role="menu"
            aria-label={user ? "Account menu" : "Sign in menu"}
            onKeyDown={onMenuKeyDown}
            className="animate-menu-pop absolute right-0 z-50 mt-2.5 hidden lg:block w-84 max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-[28px] bg-card/95 p-3 shadow-clay ring-1 ring-line/90 backdrop-blur-2xl no-scrollbar"
          >
            {items}
          </div>
        </>
      )}
    </div>
  );
}
