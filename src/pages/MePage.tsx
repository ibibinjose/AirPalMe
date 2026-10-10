import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Coffee,
  Copy,
  Edit3,
  ExternalLink,
  HeartHandshake,
  Images,
  LogOut,
  MessageSquare,
  PhoneCall,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { usePlans } from "@/contexts/PlanContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import {
  listCatchUps,
  subscribeCatchUpsForOwner,
  updateCatchUpStatus,
  type CatchUpItem,
} from "@/lib/catchup";
import { getDailyOutfitRecommendation } from "@/lib/outfit";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { PlanGridCard } from "@/components/airpal/PlanGridCard";
import { EcosystemSwitcher } from "@/components/brand/EcosystemSwitcher";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { ImageField } from "@/components/media/ImageField";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  googleWalletTicketUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
  ticketWalletPassUrl,
} from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import { triggerHaptic } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import { bioPath } from "@shared/bio";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import type { PlanType } from "@shared/plan";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function MePage() {
  const [, nav] = useLocation();
  const { user, logout, sendVerificationEmail, isHost } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { myPlans } = usePlans();
  const { today, weather, city, day } = useLocalNow();
  const { upcomingBookings } = useMyBookings();

  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>(() => listCatchUps());
  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [catchUpInitialType, setCatchUpInitialType] = useState<PlanType>("catchup");
  const [bioQrData, setBioQrData] = useState<string>("");
  const [copiedBioLink, setCopiedBioLink] = useState(false);

  // Subscribe to live catch-up proposals & appointments
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeCatchUpsForOwner(user.uid, (items) => {
      setCatchUpsList(items);
    });
  }, [user?.uid]);

  // Generate bio QR data url
  useEffect(() => {
    if (!mine?.handle) return;
    let live = true;
    void makeQrDataUrl(toPublicUrl(bioPath(mine.handle)), 320).then((url) => {
      if (live) setBioQrData(url);
    });
    return () => {
      live = false;
    };
  }, [mine?.handle]);

  const outfitAdvice = useMemo(() => {
    if (!weather) return null;
    return getDailyOutfitRecommendation(weather.temp, weather.code, weather.isDay);
  }, [weather]);

  // TODAY'S ITEMS
  const todayAppointments = useMemo(() => {
    return catchUpsList.filter((item) => item.date === today && item.status !== "dismissed");
  }, [catchUpsList, today]);

  const todayTickets = useMemo(() => {
    if (!upcomingBookings) return [];
    return upcomingBookings.filter((b) => b.date === today);
  }, [upcomingBookings, today]);

  const todayPlans = useMemo(() => {
    return myPlans.filter((p) => p.date === today && p.status !== "cancelled");
  }, [myPlans, today]);

  const todayTotalCount = todayAppointments.length + todayTickets.length + todayPlans.length;

  // UPCOMING ITEMS
  const pendingAppointments = useMemo(() => {
    return catchUpsList.filter((item) => item.status === "pending");
  }, [catchUpsList]);

  const upcomingScheduledAppointments = useMemo(() => {
    return catchUpsList
      .filter((item) => item.status !== "dismissed" && item.status !== "pending" && (!item.date || item.date >= today))
      .sort((a, b) => ((a.date || "") > (b.date || "") ? 1 : -1));
  }, [catchUpsList, today]);

  const upcomingTickets = useMemo(() => {
    if (!upcomingBookings) return [];
    return upcomingBookings.filter((b) => !b.date || b.date >= today);
  }, [upcomingBookings, today]);

  const upcomingPlansList = useMemo(() => {
    return myPlans
      .filter((p) => (!p.date || p.date >= today) && p.status !== "cancelled")
      .sort((a, b) => ((a.date || "") > (b.date || "") ? 1 : -1));
  }, [myPlans, today]);

  const handleCopyBioLink = async () => {
    if (!mine?.handle) {
      nav("/bio/setup");
      return;
    }
    void triggerHaptic("light");
    const link = toPublicUrl(bioPath(mine.handle));
    try {
      await navigator.clipboard.writeText(link);
      setCopiedBioLink(true);
      toast.success("Public Bio link copied to clipboard!");
      setTimeout(() => setCopiedBioLink(false), 2000);
    } catch {
      toast.message(link);
    }
  };

  const onAvatar = async (src?: string) => {
    if (!mine) {
      nav("/bio/setup");
      return;
    }
    await updateProfile({ handle: mine.handle, avatar: src || "" });
    toast.success("Profile photo updated");
  };

  if (!user) {
    return (
      <AuthGate
        next="/me"
        kicker="AirPal Me"
        title="Universal AirPal Identity"
        lede="Sign in or create an account to access your personal cockpit, tickets, appointments, and plans."
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-4 md:px-6 md:pt-6">
      {/* Ecosystem Lens Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <EcosystemSwitcher currentPath="/me" variant="header" />
        <div className="flex items-center gap-2">
          {mine ? (
            <Link
              href={bioPath(mine.handle)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink ring-1 ring-line shadow-2xs hover:bg-card transition active:scale-95"
            >
              <UserRound size={13} className="text-accent" />
              <span>@{mine.handle} Bio</span>
            </Link>
          ) : (
            <Link
              href="/bio/setup"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink transition active:scale-95"
            >
              <Sparkles size={13} />
              <span>Claim @handle</span>
            </Link>
          )}
          <Link
            href="/pass"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 shadow-2xs hover:bg-amber-500/20 transition active:scale-95"
          >
            <Ticket size={13} className="text-amber-500" />
            <span>AirPal Pass ({upcomingTickets.length}) →</span>
          </Link>
        </div>
      </div>

      {/* Main Grid Layout: Left Column (Identity & Context), Right Column (Today, Appointments, Tickets, Plans) */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0">
        {/* Left Column (5 cols): Identity Card, Quick Links & Weather */}
        <div className="lg:col-span-5 space-y-4">
          {/* Identity & Bio Switcher Card */}
          <div className="overflow-hidden rounded-[32px] ring-1 ring-line bg-card shadow-xs">
            <div className="relative h-28 bg-gradient-to-br from-[#121829] via-[#1c2438] to-[#0f1424]">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1805db_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
              <Photo src="/media/harbour.jpg" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              <div className="hero-scrim absolute inset-0" />
            </div>

            <div className="flex flex-col items-center px-6 pb-6 text-center">
              <div className="-mt-14 rounded-full ring-4 ring-card bg-paper shadow-md">
                <ImageField
                  kind="avatar"
                  round
                  align="center"
                  previewClassName="h-28 w-28"
                  value={mine?.avatar}
                  onChange={(src) => void onAvatar(src)}
                  cornerBadge={mine ? <BioKindIcon kind={mine.kind} /> : undefined}
                />
              </div>

              <h1 className="font-display mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {user.displayName || mine?.name || "My Account"}
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-mute">
                {mine ? `@${mine.handle}` : biosReady ? "No @handle claimed yet" : "Loading profile…"}
              </p>

              {mine && (
                <div className="mt-2 flex items-center gap-2">
                  <BioKindBadge kind={mine.kind} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                    ● Active
                  </span>
                </div>
              )}

              {/* Navigation Pill Deck: Me vs Bio Switcher */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 w-full">
                <span className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-2xs">
                  <Sparkles size={12} />
                  <span>Me Cockpit</span>
                </span>
                {mine ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[38px] rounded-full border border-line px-3 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                    onClick={() => nav(bioPath(mine.handle))}
                  >
                    <span>@{mine.handle} Bio</span>
                    <ExternalLink size={11} className="text-mute ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[38px] rounded-full border border-line px-3 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                    onClick={() => nav("/bio/setup")}
                  >
                    Claim @handle
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[38px] rounded-full border border-line px-3 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                  onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
                >
                  <Edit3 size={11} className="mr-1 text-mute" />
                  Edit Bio
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[38px] rounded-full border border-line px-3 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                  onClick={() => nav("/settings")}
                >
                  <Settings size={11} className="mr-1 text-mute" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              type="button"
              onClick={() => nav("/plan")}
              className="rounded-2xl bg-card p-3 ring-1 ring-line/80 shadow-2xs hover:ring-brand/30 transition text-left"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-accent">Plans</span>
              <span className="font-display text-xl font-bold text-ink">{myPlans.length}</span>
              <span className="block text-[10px] text-mute">Trips & Hangouts</span>
            </button>
            <button
              type="button"
              onClick={() => nav("/me/tickets")}
              className="rounded-2xl bg-card p-3 ring-1 ring-line/80 shadow-2xs hover:ring-brand/30 transition text-left"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">Tickets</span>
              <span className="font-display text-xl font-bold text-ink">{upcomingTickets.length}</span>
              <span className="block text-[10px] text-mute">Active Passes</span>
            </button>
            <button
              type="button"
              onClick={() => nav("/calendar")}
              className="rounded-2xl bg-card p-3 ring-1 ring-line/80 shadow-2xs hover:ring-brand/30 transition text-left"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-600">Catch-ups</span>
              <span className="font-display text-xl font-bold text-ink">
                {upcomingScheduledAppointments.length + pendingAppointments.length}
              </span>
              <span className="block text-[10px] text-mute">Appointments</span>
            </button>
          </div>

          {/* Scannable Bio Pass & Wallet Export Card */}
          {mine && (
            <div className="rounded-[28px] ring-1 ring-line bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  <QrCode size={14} className="text-accent" />
                  <span>My Digital Bio Pass</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-mute">@{mine.handle}</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="grid place-items-center h-24 w-24 rounded-2xl bg-white p-1.5 shadow-inner ring-1 ring-black/5 shrink-0">
                  {bioQrData ? (
                    <img src={bioQrData} alt={`QR for @${mine.handle}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-[10px] text-mute animate-pulse">Loading…</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-mute leading-relaxed">
                    Present your QR pass at meetups or add your card to Apple &amp; Google Wallet.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyBioLink}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                    >
                      {copiedBioLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedBioLink ? "Copied" : "Share Link"}</span>
                    </button>
                    <Link
                      href={bioPath(mine.handle)}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
                    >
                      <span>View Bio</span>
                      <ArrowRight size={11} className="text-mute" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-line/70">
                <AppleWalletButton
                  className="w-full sm:w-auto flex-1 justify-center min-h-[38px]"
                  onClick={() => {
                    const passUrl = businessCardWalletPassUrl(mine.handle);
                    void openAppleWalletPass(passUrl, "@" + mine.handle + "-AirPal-Pass");
                  }}
                />
                <GoogleWalletButton
                  className="w-full sm:w-auto flex-1 justify-center min-h-[38px]"
                  onClick={() => {
                    void openGoogleWalletPass(googleWalletCardUrl(mine.handle));
                  }}
                />
              </div>
            </div>
          )}

          {/* Daily Weather & Outfit Recommendation */}
          {weather && outfitAdvice && (
            <div className="rounded-[28px] ring-1 ring-line bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  Daily Companion · {city || "Sydney"}
                </span>
                <span className="text-xs font-bold text-ink">{weather.temp}°C</span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {outfitAdvice.icon}
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-ink">{outfitAdvice.vibe}</p>
                  <p className="text-xs text-mute">{outfitAdvice.summary}</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-paper p-3 text-xs">
                <p className="font-semibold text-ink">👕 Recommended Outfit:</p>
                <p className="text-mute mt-0.5">{outfitAdvice.outfit}</p>
                <p className="mt-1.5 text-accent font-medium">✨ {outfitAdvice.accessory}</p>
              </div>
            </div>
          )}

          {/* Handle management if owner */}
          {mine && (
            <div className="rounded-[28px] ring-1 ring-line bg-card p-4 sm:p-5 shadow-xs">
              <ChangeHandleForm current={mine.handle} profileId={mine.id} />
            </div>
          )}

          {user.email && user.emailVerified === false && (
            <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
          )}

          {/* Invite mates */}
          <div className="rounded-[28px] border border-line bg-card p-4 sm:p-5">
            <h2 className="font-display text-base font-bold text-ink">Invite mates to AirPal</h2>
            <div className="mt-2.5">
              <InvitePanel handle={mine?.handle} loading={!biosReady} />
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Today's Agenda, Appointments, Tickets & Plans */}
        <div className="lg:col-span-7 space-y-6">
          {/* 🌟 1. TODAY'S AGENDA */}
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-paper via-card to-paper/90 p-5 sm:p-6 ring-1 ring-brand/30 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                <Sparkles size={14} className="text-accent" />
                <span>Today&apos;s Agenda · {day}, {today}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-2.5 py-0.5",
                  todayTotalCount > 0 ? "bg-brand text-white" : "bg-emerald-500/15 text-emerald-600",
                )}
              >
                {todayTotalCount > 0 ? `${todayTotalCount} scheduled` : "Clear schedule"}
              </span>
            </div>

            {todayTotalCount > 0 ? (
              <div className="space-y-3 mt-4">
                {/* Today's Appointments */}
                {todayAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-line/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                        {item.requesterPhoto ? (
                          <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-sm text-white">
                            {item.requesterName[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-ink truncate">{item.requesterName}</span>
                          <span className="text-[10px] font-semibold rounded-full bg-brand/10 text-accent px-2 py-0.2">
                            {item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Coffee"}
                          </span>
                        </div>
                        <p className="text-xs text-mute mt-0.5 truncate">
                          🕒 Today {item.time ? `@ ${item.time}` : ""} {item.venue ? `· ${item.venue}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => void triggerHaptic("light")}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition active:scale-95"
                        >
                          <PhoneCall size={12} className="text-emerald-700" />
                          <span>Join Call</span>
                        </a>
                      )}
                      <AddToCalendarMenu
                        event={{
                          title: `Catch Up: ${item.requesterName}`,
                          description: item.notes || `AirPal with ${item.requesterName}`,
                          startsAt: `${item.date}T${item.time || "12:00"}:00`,
                          venue: item.venue,
                        }}
                        size="sm"
                        variant="ghost"
                        label="Calendar"
                        buttonClassName="h-8 px-2.5 text-[11px] rounded-full border border-line"
                      />
                    </div>
                  </div>
                ))}

                {/* Today's Tickets */}
                {todayTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-500/5 p-4 ring-1 ring-amber-500/25 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/20 text-amber-700 shrink-0">
                        <Ticket size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-ink truncate block">{ticket.title}</span>
                        <p className="text-xs text-mute mt-0.5 truncate">
                          🎟 Pass ({ticket.spots || 1}x) {ticket.time ? `· Doors ${ticket.time}` : ""} · {ticket.suburb || "Venue"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        className="min-h-[38px] rounded-full bg-amber-600 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 active:scale-95"
                        onClick={() => nav(`/ticket/${ticket.id}`)}
                      >
                        <QrCode size={13} className="mr-1" />
                        Open Pass
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Today's Plans */}
                {todayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-line/80 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-ink truncate block">{plan.title}</span>
                      <p className="text-xs text-mute mt-0.5 truncate">
                        👥 Today {plan.time ? `@ ${plan.time}` : ""} · {plan.destination || plan.city || "Sydney"} ({plan.attendees?.length || 1} going)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[38px] rounded-full border border-line px-3.5 text-xs font-bold text-ink hover:bg-paper active:scale-95 shrink-0 self-end sm:self-center"
                      onClick={() => nav(`/plan/${plan.id}`)}
                    >
                      Open Thread →
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-line p-5 text-center bg-card/50">
                <p className="font-display text-base font-bold text-ink">Your day is open</p>
                <p className="text-xs text-mute mt-1 max-w-sm mx-auto leading-relaxed">
                  No appointments, tickets, or plans scheduled for today. Turn free time into an experience!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setCatchUpInitialType("catchup");
                      setCatchUpModalOpen(true);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                  >
                    <Coffee size={13} />
                    <span>Propose a Catch-Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/now")}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                  >
                    <span>🧭 Plan on Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/pass")}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-amber-500/10 px-4 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <Ticket size={13} />
                    <span>Discover Passes</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ☕ 2. APPOINTMENTS & CATCH-UPS SECTION */}
          <section className="rounded-[32px] ring-1 ring-line bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  <Coffee size={14} className="text-accent" />
                  <span>Appointments &amp; Catch-ups</span>
                </div>
                <h2 className="font-display text-xl font-bold text-ink mt-0.5">
                  1-on-1 Catch-ups &amp; Syncs ({upcomingScheduledAppointments.length + pendingAppointments.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCopyBioLink}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                title="Copy your Meet & Hangout link"
              >
                {copiedBioLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedBioLink ? "Copied" : "Share Meet Link"}</span>
              </button>
            </div>

            {/* Quick 3-Pillar Proposal Launcher */}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {(
                [
                  {
                    type: "catchup" as const,
                    label: "Catch Up",
                    sub: "1-on-1 coffee",
                    Icon: Coffee,
                    tint: "bg-amber-500/15 text-amber-700",
                  },
                  {
                    type: "meeting" as const,
                    label: "Meeting",
                    sub: "1-on-1 sync",
                    Icon: Calendar,
                    tint: "bg-sky-500/15 text-sky-700",
                  },
                  {
                    type: "nightout" as const,
                    label: "Hangout",
                    sub: "Group plan",
                    Icon: Users,
                    tint: "bg-violet-500/15 text-violet-700",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setCatchUpInitialType(opt.type);
                    setCatchUpModalOpen(true);
                  }}
                  className="flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-paper/60 p-3 text-center ring-1 ring-line/80 shadow-2xs transition hover:ring-brand/40 active:scale-[0.97]"
                >
                  <span className={cn("mb-1.5 grid h-9 w-9 place-items-center rounded-xl", opt.tint)}>
                    <opt.Icon size={16} />
                  </span>
                  <span className="text-xs font-bold text-ink">{opt.label}</span>
                  <span className="text-[10px] text-mute">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Pending Requests / Inbox */}
            {pendingAppointments.length > 0 && (
              <div className="mt-5 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <HeartHandshake size={14} className="text-amber-700" />
                    <span>Requests awaiting your response ({pendingAppointments.length})</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase rounded-full bg-amber-500/25 px-2 py-0.5 text-amber-900">
                    Action Needed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pendingAppointments.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-card p-3.5 ring-1 ring-line/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                          {item.requesterPhoto ? (
                            <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white">
                              {item.requesterName[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-ink truncate">{item.requesterName}</p>
                          <p className="text-[11px] text-mute truncate mt-0.5">
                            {item.type === "meeting" ? "📅 Meeting" : item.type === "nightout" ? "👥 Hangout" : "☕ Coffee"}
                            {item.date && ` · ${item.date}`}
                            {item.time && ` @ ${item.time}`}
                            {item.venue && ` · ${item.venue}`}
                          </p>
                          {item.notes && <p className="text-[11px] text-ink/80 italic mt-0.5 truncate">&ldquo;{item.notes}&rdquo;</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          className="min-h-[34px] rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95"
                          onClick={() => {
                            void updateCatchUpStatus(item.id, "accepted");
                            toast.success(`Accepted catch up with ${item.requesterName}!`);
                          }}
                        >
                          <Check size={12} className="mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[34px] rounded-full border border-line px-2.5 text-xs font-medium text-mute hover:text-ink"
                          onClick={() => {
                            void updateCatchUpStatus(item.id, "dismissed");
                            toast.info("Request dismissed");
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Scheduled Appointments List */}
            {upcomingScheduledAppointments.length > 0 ? (
              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Upcoming Scheduled Syncs</p>
                {upcomingScheduledAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/60 p-3.5 ring-1 ring-line/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                        {item.requesterPhoto ? (
                          <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white">
                            {item.requesterName[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-ink truncate">{item.requesterName}</p>
                          {item.requesterHandle && (
                            <Link href={`/@${item.requesterHandle}`} className="text-[11px] text-mute hover:text-accent truncate">
                              @{item.requesterHandle}
                            </Link>
                          )}
                        </div>
                        <p className="text-[11px] text-mute truncate mt-0.5">
                          {item.date || "Upcoming"} {item.time ? `@ ${item.time}` : ""} {item.venue ? `· ${item.venue}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-emerald-500/15 px-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition active:scale-95"
                        >
                          <PhoneCall size={12} />
                          <span>Call</span>
                        </a>
                      )}
                      <AddToCalendarMenu
                        event={{
                          title: `Catch Up: ${item.requesterName}`,
                          description: item.notes || `AirPal with ${item.requesterName}`,
                          startsAt: `${item.date || today}T${item.time || "12:00"}:00`,
                          venue: item.venue,
                        }}
                        size="sm"
                        variant="ghost"
                        label="Calendar"
                        buttonClassName="h-8 px-2.5 text-[11px] rounded-full border border-line"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-center">
                <p className="text-xs text-mute">No upcoming appointments or catch-ups.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCatchUpInitialType("catchup");
                    setCatchUpModalOpen(true);
                  }}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-accent underline cursor-pointer"
                >
                  Propose a coffee or meeting now →
                </button>
              </div>
            ) : null}
          </section>

          {/* 🎟 3. TICKETS & PASSES SECTION */}
          <section className="rounded-[32px] ring-1 ring-line bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">
                  <Ticket size={14} className="text-amber-500" />
                  <span>AirPal Pass · Digital Wallet</span>
                </div>
                <h2 className="font-display text-xl font-bold text-ink mt-0.5">
                  My Tickets &amp; Event Passes ({upcomingTickets.length})
                </h2>
              </div>
              <Link
                href="/me/tickets"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
              >
                <span>Full Wallet</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {upcomingTickets.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {upcomingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-paper to-card p-4 ring-1 ring-line/80 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          <Ticket size={11} />
                          <span>Pass</span>
                        </span>
                        <span className="text-[11px] font-mono text-mute">{ticket.spots || 1}x Tickets</span>
                      </div>

                      <h3 className="font-display font-bold text-base text-ink leading-snug">{ticket.title}</h3>
                      <p className="text-xs text-mute mt-1">
                        📅 {ticket.date || "Anytime"} {ticket.time ? `@ ${ticket.time}` : ""}
                      </p>
                      {ticket.suburb && <p className="text-xs text-mute mt-0.5">📍 {ticket.suburb}</p>}
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/70 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        size="sm"
                        className="min-h-[36px] rounded-full bg-brand px-3 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink active:scale-95"
                        onClick={() => nav(`/ticket/${ticket.id}`)}
                      >
                        <QrCode size={13} className="mr-1" />
                        Scan Pass
                      </Button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const passUrl = ticketWalletPassUrl(ticket.id);
                            void openAppleWalletPass(passUrl, "AirPal-Ticket-" + ticket.title);
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-paper px-2.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 cursor-pointer"
                          title="Add to Apple Wallet"
                        >
                          <span>Apple Wallet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const gUrl = googleWalletTicketUrl(ticket.id);
                            openGoogleWalletPass(gUrl);
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-paper px-2.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 cursor-pointer"
                          title="Add to Google Wallet"
                        >
                          <span>Google Wallet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center bg-card/50">
                <Ticket size={24} className="mx-auto text-mute" />
                <p className="font-display text-sm font-bold text-ink mt-2">No active tickets or passes</p>
                <p className="text-xs text-mute mt-0.5 max-w-sm mx-auto">
                  Festival access, concert passes, and member dining perks live in your AirPal Passbook.
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-full bg-brand px-4 text-xs font-bold text-white active:scale-95 shadow-2xs"
                  onClick={() => nav("/pass")}
                >
                  Browse AirPal Pass →
                </Button>
              </div>
            )}
          </section>

          {/* 👥 4. UPCOMING PLANS SECTION */}
          <section className="rounded-[32px] ring-1 ring-line bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  <Users size={14} className="text-accent" />
                  <span>Hangouts &amp; Itineraries</span>
                </div>
                <h2 className="font-display text-xl font-bold text-ink mt-0.5">
                  Upcoming Plans ({upcomingPlansList.length})
                </h2>
              </div>
              <Button
                size="sm"
                className="min-h-[36px] rounded-full bg-brand px-3 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink active:scale-95"
                onClick={() => nav("/plan/new")}
              >
                <Plus size={13} className="mr-1" />
                New Plan
              </Button>
            </div>

            {upcomingPlansList.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {upcomingPlansList.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col justify-between rounded-2xl bg-paper/60 p-4 ring-1 ring-line/80 shadow-2xs hover:ring-brand/40 transition"
                  >
                    <PlanGridCard plan={plan} />
                    <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                      <span className="text-xs text-mute font-medium truncate">
                        {plan.destination || plan.city || "Sydney"}
                      </span>
                      <AddToCalendarMenu
                        event={{
                          title: plan.title,
                          description: plan.notes || "AirPal Plan",
                          startsAt: `${plan.date}T${plan.time || "12:00"}:00`,
                          venue: plan.destination || plan.city,
                        }}
                        size="sm"
                        variant="ghost"
                        label="Calendar"
                        buttonClassName="h-7 px-2.5 text-[10px] rounded-full border border-line"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center bg-card/50">
                <p className="text-xs text-mute">You don&apos;t have any upcoming plans yet.</p>
                <button
                  type="button"
                  onClick={() => nav("/plan/new")}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent underline cursor-pointer"
                >
                  Create an outing or day trip →
                </button>
              </div>
            )}
          </section>

          {/* 🛠 5. ESSENTIALS, TOOLS & WORKSPACES */}
          <section className="rounded-[32px] ring-1 ring-line bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="font-display text-lg font-bold text-ink mb-3">Tools &amp; Workspaces</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/me/inbox"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-accent">
                    <MessageSquare size={16} />
                  </span>
                  <div>
                    <span className="font-bold text-xs text-ink block">Messages &amp; Inbox</span>
                    <span className="text-[11px] text-mute">Alerts &amp; activity</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-mute" />
              </Link>

              <Link
                href="/calendar"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
                    <Calendar size={16} />
                  </span>
                  <div>
                    <span className="font-bold text-xs text-ink block">Calendar Agenda</span>
                    <span className="text-[11px] text-mute">What&apos;s on schedule</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-mute" />
              </Link>

              <Link
                href="/me/memories"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600">
                    <Images size={16} />
                  </span>
                  <div>
                    <span className="font-bold text-xs text-ink block">Memory Wall</span>
                    <span className="text-[11px] text-mute">Private keepsakes</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-mute" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-500/10 text-zinc-600">
                    <Settings size={16} />
                  </span>
                  <div>
                    <span className="font-bold text-xs text-ink block">Account Settings</span>
                    <span className="text-[11px] text-mute">Preferences &amp; security</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-mute" />
              </Link>

              {isHost ? (
                <Link
                  href="/host"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Building2 size={16} />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">Host Operations</span>
                      <span className="text-[11px] text-mute">Hotel, rooms &amp; concierge</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-mute" />
                </Link>
              ) : (
                <Link
                  href="/join"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Building2 size={16} />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">Become a Stay Host</span>
                      <span className="text-[11px] text-mute">List hotel or rooms</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-mute" />
                </Link>
              )}

              {business ? (
                <Link
                  href="/business"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Store size={16} />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">Your Business Place</span>
                      <span className="text-[11px] text-mute">@{business.handle} deals &amp; menu</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-mute" />
                </Link>
              ) : (
                <Link
                  href={partnerAccountPath({ signedIn: true, hasPlace: false })}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-paper/70 ring-1 ring-line/80 hover:bg-paper transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Store size={16} />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink block">{NAMES.partnerAccount}</span>
                      <span className="text-[11px] text-mute">Promotions &amp; discovery</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-mute" />
                </Link>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-line/70 flex items-center justify-between">
              <span className="text-xs text-mute font-medium">Signed in as {user.email || user.displayName}</span>
              <button
                type="button"
                onClick={() => void logout().then(() => nav("/"))}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Propose Catch-Up / Meeting / Hangout Modal */}
      {mine && (
        <BioCatchUpModal
          open={catchUpModalOpen}
          onClose={() => setCatchUpModalOpen(false)}
          handle={mine.handle}
          name={user.displayName || mine.name || "Me"}
          city={mine.city || city || "Sydney"}
          avatar={mine.avatar}
          ownerUid={user.uid}
          initialType={catchUpInitialType}
          defaultMeetingUrl={mine.meetingUrl}
          defaultMeetingPlatform={mine.preferredMeetingPlatform}
        />
      )}
    </div>
  );
}
