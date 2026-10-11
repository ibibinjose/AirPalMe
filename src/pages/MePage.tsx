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
  Shirt,
  Sparkles,
  Store,
  Sun,
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
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import { bioPath } from "@shared/bio";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import type { PlanType } from "@shared/plan";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type CockpitTab = "all" | "today" | "appointments" | "tickets" | "plans" | "pass";

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
  const [activeTab, setActiveTab] = useState<CockpitTab>("all");

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
        lede="Sign in or create an account to access your AirPal Me cockpit, tickets, appointments, and plans."
      />
    );
  }

  const handleTabChange = (tab: CockpitTab) => {
    void triggerHapticSelection();
    setActiveTab(tab);
  };

  const showSection = (tab: CockpitTab) => activeTab === "all" || activeTab === tab;

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6 pb-[max(6.5rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      {/* 🌟 1. APPLE HIG NATIVE PROFILE HERO CARD */}
      <div className="relative overflow-hidden rounded-[32px] bg-card ring-1 ring-line/80 shadow-sm mb-5">
        {/* Ambient Glass Scrim & Cover Graphic */}
        <div className="relative h-28 sm:h-36 bg-gradient-to-r from-brand-ink via-[#0d1538] to-[#16065c] overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          <Photo src="/media/harbour.jpg" className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />

          {/* Top Right Quick Badges */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
            <Link
              href="/pass"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-md shadow-xs hover:bg-white/25 transition active:scale-95"
            >
              <Ticket size={13} className="text-amber-400" />
              <span>AirPal Pass ({upcomingTickets.length}) →</span>
            </Link>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-4 sm:px-6 pb-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            {/* Avatar & Title */}
            <div className="flex items-end gap-3.5">
              <div className="rounded-full ring-4 ring-card bg-paper shadow-md shrink-0">
                <ImageField
                  kind="avatar"
                  round
                  align="center"
                  previewClassName="h-24 w-24 sm:h-28 sm:w-28"
                  value={mine?.avatar}
                  onChange={(src) => void onAvatar(src)}
                  cornerBadge={mine ? <BioKindIcon kind={mine.kind} /> : undefined}
                />
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight">
                    {user.displayName || mine?.name || "Test User"}
                  </h1>
                  {mine && <BioKindBadge kind={mine.kind} />}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleCopyBioLink}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    <span>{mine ? `@${mine.handle}` : biosReady ? "@claim-handle" : "@testmate"}</span>
                    {copiedBioLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-mute" />}
                  </button>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/15 rounded-full px-2 py-0.5">
                    ● Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Pill Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-xs">
                <Sparkles size={12} />
                <span>Me Cockpit</span>
              </span>

              {mine ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[38px] rounded-full border border-line px-3.5 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                  onClick={() => nav(bioPath(mine.handle))}
                >
                  <UserRound size={13} className="text-accent mr-1" />
                  <span>@{mine.handle} Bio</span>
                  <ExternalLink size={11} className="text-mute ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[38px] rounded-full border border-line px-3.5 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
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
                <Edit3 size={12} className="mr-1 text-mute" />
                <span>Edit Bio</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="min-h-[38px] rounded-full border border-line px-3 text-xs font-semibold text-ink hover:bg-paper active:scale-95"
                onClick={() => nav("/settings")}
              >
                <Settings size={12} className="mr-1 text-mute" />
                <span>Settings</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-line/60">
            <button
              type="button"
              onClick={() => handleTabChange("today")}
              className="flex items-center gap-2.5 rounded-2xl bg-paper/60 p-2.5 ring-1 ring-line/60 hover:bg-paper transition text-left cursor-pointer"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent shrink-0">
                <Sun size={15} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute block leading-tight">Today</span>
                <span className="font-display text-base font-bold text-ink tabular-nums leading-tight">
                  {todayTotalCount > 0 ? `${todayTotalCount} items` : "Open"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("appointments")}
              className="flex items-center gap-2.5 rounded-2xl bg-paper/60 p-2.5 ring-1 ring-line/60 hover:bg-paper transition text-left cursor-pointer"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-600 shrink-0">
                <Coffee size={15} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute block leading-tight">Catch-ups</span>
                <span className="font-display text-base font-bold text-ink tabular-nums leading-tight">
                  {upcomingScheduledAppointments.length + pendingAppointments.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tickets")}
              className="flex items-center gap-2.5 rounded-2xl bg-paper/60 p-2.5 ring-1 ring-line/60 hover:bg-paper transition text-left cursor-pointer"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                <Ticket size={15} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute block leading-tight">Tickets</span>
                <span className="font-display text-base font-bold text-ink tabular-nums leading-tight">
                  {upcomingTickets.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("plans")}
              className="flex items-center gap-2.5 rounded-2xl bg-paper/60 p-2.5 ring-1 ring-line/60 hover:bg-paper transition text-left cursor-pointer"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/10 text-violet-600 shrink-0">
                <Users size={15} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute block leading-tight">Plans</span>
                <span className="font-display text-base font-bold text-ink tabular-nums leading-tight">
                  {myPlans.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 2. APPLE-INSPIRED SEGMENTED COCKPIT TAB BAR */}
      <div className="sticky top-2 z-20 mb-6 -mx-1 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-full bg-card/90 p-1.5 ring-1 ring-line/80 backdrop-blur-2xl shadow-sm">
          {[
            { id: "all" as const, label: "All Cockpit", icon: Sparkles },
            { id: "today" as const, label: `Today (${todayTotalCount})`, icon: Sun },
            { id: "appointments" as const, label: `Catch-ups (${upcomingScheduledAppointments.length + pendingAppointments.length})`, icon: Coffee },
            { id: "tickets" as const, label: `Tickets (${upcomingTickets.length})`, icon: Ticket },
            { id: "plans" as const, label: `Plans (${upcomingPlansList.length})`, icon: Users },
            { id: "pass" as const, label: "Bio & QR Pass", icon: QrCode },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-all cursor-pointer select-none active:scale-95",
                  isCurrent
                    ? "bg-brand text-white shadow-xs"
                    : "text-mute hover:bg-paper hover:text-ink",
                )}
              >
                <Icon size={13} className={isCurrent ? "text-white" : "text-mute"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 3. MAIN COCKPIT CONTENT */}
      <div className="space-y-6">
        {/* SECTION: TODAY'S AGENDA */}
        {showSection("today") && (
          <section className="overflow-hidden rounded-[32px] bg-card p-5 sm:p-6 ring-1 ring-line/80 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
                  <Sun size={16} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                    Today&apos;s Agenda
                  </h2>
                  <p className="text-xs text-mute">{day}, {today} · {city || "Sydney"}</p>
                </div>
              </div>

              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-2.5 py-1",
                  todayTotalCount > 0 ? "bg-brand text-white" : "bg-emerald-500/15 text-emerald-600",
                )}
              >
                {todayTotalCount > 0 ? `${todayTotalCount} scheduled today` : "Clear schedule"}
              </span>
            </div>

            {/* Weather & Outfit Advice Bar */}
            {weather && outfitAdvice && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/60 p-3.5 ring-1 ring-line/60">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                    <Shirt size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink leading-snug">
                      👕 Outfit: {outfitAdvice.outfit}
                    </p>
                    <p className="text-[11px] text-accent leading-snug">
                      ✨ {outfitAdvice.accessory}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display text-sm font-bold text-ink tabular-nums">{weather.temp}°C</span>
                  <span className="block text-[10px] text-mute">{weather.isDay ? "Daytime" : "Evening"} forecast</span>
                </div>
              </div>
            )}

            {todayTotalCount > 0 ? (
              <div className="space-y-3">
                {/* Today's Appointments */}
                {todayAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/50 p-4 ring-1 ring-line/70 shadow-2xs"
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
                          <span className="text-[10px] font-semibold rounded-full bg-brand/10 text-accent px-2 py-0.5">
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
                        buttonClassName="h-9 px-3 text-xs rounded-full border border-line"
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/50 p-4 ring-1 ring-line/70 shadow-2xs"
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
              <div className="rounded-2xl border border-dashed border-line p-5 text-center bg-paper/30">
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
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                  >
                    <Coffee size={13} />
                    <span>Propose a Catch-Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/now")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                  >
                    <span>🧭 Plan on Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/pass")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-amber-500/10 px-4 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <Ticket size={13} />
                    <span>Discover Passes</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION: APPOINTMENTS & CATCH-UPS */}
        {showSection("appointments") && (
          <section className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
                  <Coffee size={16} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                    Appointments &amp; Catch-ups
                  </h2>
                  <p className="text-xs text-mute">
                    1-on-1 Catch-ups &amp; Syncs ({upcomingScheduledAppointments.length + pendingAppointments.length})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBioLink}
                  className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                  title="Copy your Meet & Hangout link"
                >
                  {copiedBioLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedBioLink ? "Copied" : "Share Meet Link"}</span>
                </button>
              </div>
            </div>

            {/* Quick Proposal Options */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
              {(
                [
                  { type: "catchup" as const, label: "Catch Up", sub: "1-on-1 coffee", Icon: Coffee, tint: "bg-amber-500/15 text-amber-700" },
                  { type: "meeting" as const, label: "Meeting", sub: "1-on-1 sync", Icon: Calendar, tint: "bg-sky-500/15 text-sky-700" },
                  { type: "nightout" as const, label: "Hangout", sub: "Group plan", Icon: Users, tint: "bg-violet-500/15 text-violet-700" },
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
                  className="flex min-h-[76px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-paper/60 p-2.5 text-center ring-1 ring-line/80 shadow-2xs transition hover:ring-brand/40 active:scale-95"
                >
                  <span className={cn("mb-1 grid h-8 w-8 place-items-center rounded-xl", opt.tint)}>
                    <opt.Icon size={15} />
                  </span>
                  <span className="text-xs font-bold text-ink">{opt.label}</span>
                  <span className="text-[10px] text-mute leading-none">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Pending Requests */}
            {pendingAppointments.length > 0 && (
              <div className="mb-5 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30">
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
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          className="min-h-[36px] rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95"
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
                          className="min-h-[36px] rounded-full border border-line px-2.5 text-xs font-medium text-mute hover:text-ink"
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

            {/* Upcoming Scheduled Syncs */}
            {upcomingScheduledAppointments.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Upcoming Scheduled Syncs</p>
                {upcomingScheduledAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/50 p-3.5 ring-1 ring-line/70 shadow-2xs"
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
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-emerald-500/15 px-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition active:scale-95"
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
                        buttonClassName="h-9 px-3 text-xs rounded-full border border-line"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-4 text-center">
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
        )}

        {/* SECTION: TICKETS & PASSES */}
        {showSection("tickets") && (
          <section className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Ticket size={16} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                    AirPal Pass · Digital Wallet
                  </h2>
                  <p className="text-xs text-mute">
                    My Tickets &amp; Event Passes ({upcomingTickets.length})
                  </p>
                </div>
              </div>

              <Link
                href="/me/tickets"
                className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
              >
                <span>Full Wallet</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {upcomingTickets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {upcomingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative overflow-hidden rounded-2xl bg-paper/60 p-4 ring-1 ring-line/70 shadow-2xs flex flex-col justify-between"
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
                        className="min-h-[38px] rounded-full bg-brand px-3 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink active:scale-95"
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
              <div className="rounded-2xl border border-dashed border-line p-5 text-center bg-paper/30">
                <Ticket size={24} className="mx-auto text-mute" />
                <p className="font-display text-sm font-bold text-ink mt-2">No active tickets or passes</p>
                <p className="text-xs text-mute mt-0.5 max-w-sm mx-auto">
                  Festival access, concert passes, and member dining perks live in your AirPal Passbook.
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-full bg-brand px-4 text-xs font-bold text-white active:scale-95 shadow-xs"
                  onClick={() => nav("/pass")}
                >
                  Browse AirPal Pass →
                </Button>
              </div>
            )}
          </section>
        )}

        {/* SECTION: UPCOMING PLANS */}
        {showSection("plans") && (
          <section className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                  <Users size={16} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                    Upcoming Plans
                  </h2>
                  <p className="text-xs text-mute">Hangouts &amp; Itineraries ({upcomingPlansList.length})</p>
                </div>
              </div>

              <Button
                size="sm"
                className="min-h-[38px] rounded-full bg-brand px-3 text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95"
                onClick={() => nav("/plan/new")}
              >
                <Plus size={13} className="mr-1" />
                New Plan
              </Button>
            </div>

            {upcomingPlansList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {upcomingPlansList.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col justify-between rounded-2xl bg-paper/60 p-4 ring-1 ring-line/70 shadow-2xs hover:ring-brand/40 transition"
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
                        buttonClassName="h-8 px-2.5 text-[11px] rounded-full border border-line"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-5 text-center bg-paper/30">
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
        )}

        {/* SECTION: DIGITAL BIO PASS & QR CARD */}
        {showSection("pass") && mine && (
          <section className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <QrCode size={16} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                    My Digital Bio Pass
                  </h2>
                  <p className="text-xs text-mute">Universal Contact Pass &amp; Apple/Google Wallet</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-mute">@{mine.handle}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl bg-paper/60 p-4 sm:p-5 ring-1 ring-line/60">
              <div className="grid place-items-center h-28 w-28 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 shrink-0">
                {bioQrData ? (
                  <img src={bioQrData} alt={`QR for @${mine.handle}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="text-[10px] text-mute animate-pulse">Loading QR…</div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
                <p className="text-xs text-mute leading-relaxed">
                  Present your digital bio pass at meetups or add directly to Apple &amp; Google Wallet for instant contact exchange.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyBioLink}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    {copiedBioLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedBioLink ? "Copied" : "Share Bio Link"}</span>
                  </button>

                  <Link
                    href={bioPath(mine.handle)}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 shadow-2xs"
                  >
                    <span>View Bio</span>
                    <ArrowRight size={11} className="text-mute" />
                  </Link>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-line/60">
                  <AppleWalletButton
                    className="w-full sm:w-auto flex-1 justify-center min-h-[40px]"
                    onClick={() => {
                      const passUrl = businessCardWalletPassUrl(mine.handle);
                      void openAppleWalletPass(passUrl, "@" + mine.handle + "-AirPal-Pass");
                    }}
                  />
                  <GoogleWalletButton
                    className="w-full sm:w-auto flex-1 justify-center min-h-[40px]"
                    onClick={() => {
                      void openGoogleWalletPass(googleWalletCardUrl(mine.handle));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Handle Management */}
            <div className="mt-4 pt-4 border-t border-line/60">
              <ChangeHandleForm current={mine.handle} profileId={mine.id} />
            </div>
          </section>
        )}

        {/* 🛠 4. TOOLS, WORKSPACES & INVITES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Invite Mates Card */}
          <div className="rounded-[28px] ring-1 ring-line/80 bg-card p-5 shadow-xs">
            <h3 className="font-display text-base font-bold text-ink mb-1">Invite mates to AirPal</h3>
            <p className="text-xs text-mute mb-3">Earn founder referral badges &amp; points.</p>
            <InvitePanel handle={mine?.handle} loading={!biosReady} />
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-[28px] ring-1 ring-line/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink mb-3">Workspaces &amp; Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/me/inbox"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                >
                  <MessageSquare size={14} className="text-accent" />
                  <span>Inbox</span>
                </Link>
                <Link
                  href="/calendar"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                >
                  <Calendar size={14} className="text-sky-600" />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/me/memories"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                >
                  <Images size={14} className="text-purple-600" />
                  <span>Memories</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                >
                  <Settings size={14} className="text-zinc-600" />
                  <span>Settings</span>
                </Link>
                {isHost ? (
                  <Link
                    href="/host"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                  >
                    <Building2 size={14} className="text-emerald-600" />
                    <span>Host Tools</span>
                  </Link>
                ) : (
                  <Link
                    href="/join"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                  >
                    <Building2 size={14} className="text-emerald-600" />
                    <span>Become Host</span>
                  </Link>
                )}
                {business ? (
                  <Link
                    href="/business"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                  >
                    <Store size={14} className="text-amber-600" />
                    <span>Business Place</span>
                  </Link>
                ) : (
                  <Link
                    href={partnerAccountPath({ signedIn: true, hasPlace: false })}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper transition text-xs font-semibold text-ink"
                  >
                    <Store size={14} className="text-amber-600" />
                    <span>{NAMES.partnerAccount}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
              <span className="text-[11px] text-mute font-medium truncate max-w-[200px]">
                {user.email || user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout().then(() => nav("/"))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                <LogOut size={12} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {user.email && user.emailVerified === false && (
          <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
        )}
      </div>

      {/* Propose Catch-Up Modal */}
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
