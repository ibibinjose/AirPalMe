import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Check,
  Coffee,
  Copy,
  HeartHandshake,
  PhoneCall,
  Plus,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { ImageField } from "@/components/media/ImageField";
import { Photo } from "@/components/ui/Photo";
import { EVENT_FLAVOUR_LABELS } from "@shared/event";
import { hrefForStall } from "@/lib/bio-handle";
import { bioPath } from "@shared/bio";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";
import { usePlans } from "@/contexts/PlanContext";
import { listMemories } from "@/lib/memories";
import { listPeople } from "@/lib/people";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { BookingsSection } from "@/components/booking/BookingsSection";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { CatchUpSlotActions } from "@/components/bio/CatchUpSlotActions";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { PlanGridCard } from "@/components/airpal/PlanGridCard";
import {
  subscribeCatchUpsForOwner,
  updateCatchUpStatus,
  type CatchUpItem,
} from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import type { PlanType } from "@shared/plan";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";

function Row({
  kicker,
  title,
  action,
  onClick,
}: {
  kicker: string;
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[50px] w-full cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-2xl ring-1 ring-line bg-card px-4 py-3.5 text-left transition hover:ring-brand/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{kicker}</span>
        <span className="block truncate font-medium">{title}</span>
      </span>
      <span className="shrink-0 flex min-h-[32px] items-center rounded-full border border-line px-3 py-1 text-xs font-semibold">{action}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export function MePage() {
  const [, nav] = useLocation();
  const { user, logout, sendVerificationEmail } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { savedEvents, savedStalls, getEvent, stalls, calendarEvents } = useEvents();
  const goingCount = calendarEvents.filter((e) => e.isGoing).length;
  const interestedCount = calendarEvents.filter((e) => e.isInterested).length;
  const peopleCount = listPeople().length;
  const memoryCount = listMemories().length;
  const { myPlans } = usePlans();
  const tripCount = myPlans.length;
  const savedCount = savedEvents.length + savedStalls.length;

  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [catchUpInitialType, setCatchUpInitialType] = useState<PlanType>("catchup");
  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>([]);
  const [copiedBioLink, setCopiedBioLink] = useState(false);

  const myPublicPlans = myPlans.filter((p) => p.isPublic && p.status !== "cancelled");

  useEffect(() => {
    if (!user) return;
    return subscribeCatchUpsForOwner(user.uid, (items) => {
      setCatchUpsList(items);
    });
  }, [user]);

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
      toast.success("Meet & Hangout link copied to clipboard!");
      setTimeout(() => setCopiedBioLink(false), 2000);
    } catch {
      toast.message(link);
    }
  };

  if (!user) {
    return (
      <AuthGate
        next="/me"
        kicker="Account"
        title="One login"
        lede="Sign in or create an account first. Same login for your @handle, saved stalls, and hosting."
      />
    );
  }

  async function onAvatar(src?: string) {
    if (!mine) {
      nav("/bio/setup");
      return;
    }
    await updateProfile({ handle: mine.handle, avatar: src || "" });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-6 md:px-6">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Avatar Hero, Handle, Quick Links & Contacts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="overflow-hidden rounded-[28px] ring-1 ring-line bg-card text-center shadow-xs">
            <div className="relative h-28">
              <Photo src="/media/harbour.jpg" className="absolute inset-0 h-full w-full object-cover" />
              <div className="hero-scrim absolute inset-0" />
            </div>
            <div className="flex flex-col items-center px-6 pb-6">
              <div className="-mt-14 rounded-full ring-4 ring-card">
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
              <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-ink">{user.displayName || mine?.name || "Account"}</h1>
              <p className="mt-1 text-sm font-medium text-mute">
                {mine ? `@${mine.handle}` : biosReady ? "No @handle yet" : "Loading your profile…"}
              </p>
              {mine && (
                <div className="mt-2">
                  <BioKindBadge kind={mine.kind} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  className="min-h-[44px] cursor-pointer rounded-full px-4 font-semibold shadow-xs active:scale-95"
                  disabled={!mine && !biosReady}
                  onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
                >
                  {mine ? "Edit profile" : biosReady ? "Choose @handle" : "Loading…"}
                </Button>
                {mine && (
                  <Button size="sm" variant="ghost" className="min-h-[44px] cursor-pointer rounded-full border border-line px-4 active:scale-95" onClick={() => nav(bioPath(mine.handle))}>
                    Public bio
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="min-h-[44px] cursor-pointer rounded-full border border-line px-4 active:scale-95" onClick={() => nav("/me/tickets")}>
                  Tickets
                </Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] cursor-pointer rounded-full border border-line px-4 active:scale-95" onClick={() => nav("/settings")}>
                  Settings
                </Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] cursor-pointer rounded-full border border-line px-4 active:scale-95" onClick={() => nav("/deals")}>
                  Deals
                </Button>
              </div>
            </div>
          </div>

          {/* Travel identity — a reason to build a profile */}
          <div className="rounded-[28px] ring-1 ring-line bg-card p-5 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Travel identity</p>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { v: String(tripCount), l: "Trips" },
                { v: String(goingCount + interestedCount), l: "Events" },
                { v: String(savedCount), l: "Saved" },
                { v: String(peopleCount), l: "People" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-paper px-1 py-2.5">
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-display text-[19px] font-bold tabular-nums text-ink">{s.v}</dd>
                  <dd className="text-[11px] font-medium text-mute">{s.l}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => nav("/plan")}
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-full bg-paper px-3.5 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Trips
              </button>
              <button
                type="button"
                onClick={() => nav("/me/memories")}
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-full bg-paper px-3.5 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Moments ({memoryCount})
              </button>
              <button
                type="button"
                onClick={() => nav("/calendar")}
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-full bg-paper px-3.5 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Events
              </button>
              <button
                type="button"
                onClick={() => nav("/settings")}
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-full bg-paper px-3.5 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Settings
              </button>
            </div>
          </div>

          {mine && (
            <div className="rounded-[28px] ring-1 ring-line bg-card p-5 shadow-xs">
              <ChangeHandleForm current={mine.handle} profileId={mine.id} />
            </div>
          )}

          <AccountContacts compact />

          {user.email && user.emailVerified === false && (
            <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
          )}

          <section className="mt-6 rounded-3xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-bold text-ink">Invite friends</h2>
            <div className="mt-3">
              <InvitePanel handle={mine?.handle} loading={!biosReady} />
            </div>
          </section>
        </div>

        {/* Right Column: Meet & Hangout Hub, Activity, Spaces, Belonging, Keepsakes & Saved (7 cols) */}
        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-6">
          {/* 🌟 MEET & HANGOUT + PUBLIC ACTIVITIES HUB */}
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-paper via-card to-paper/80 p-5 ring-1 ring-brand/30 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent" />
                <span>Meet &amp; Hangout · Hub</span>
              </span>
              {mine ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                  @{mine.handle} Active
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 rounded-full px-2.5 py-0.5">
                  Set Up @handle
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  Your Meet &amp; Hangout Links
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Propose coffee, sync meetings, or group hangouts. Sync any confirmed plan to your phone calendar.
                </p>
                {mine?.meetingUrl && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {mine.preferredMeetingPlatform === "facetime" || mine.meetingUrl.includes("facetime") ? (
                      <PhoneCall size={12} className="text-emerald-700" />
                    ) : (
                      <Video size={12} className="text-accent" />
                    )}
                    <span>
                      {mine.preferredMeetingPlatform === "facetime" || mine.meetingUrl.includes("facetime")
                        ? "FaceTime link active"
                        : "Google Meet link active"}
                    </span>
                  </div>
                )}
              </div>
              {mine && (
                <button
                  type="button"
                  onClick={handleCopyBioLink}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
                  title="Copy your Meet & Hangout link"
                >
                  {copiedBioLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-mute" />}
                  <span>{copiedBioLink ? "Copied" : "Share Link"}</span>
                </button>
              )}
            </div>

            {/* Quick Format Launcher Buttons */}
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
                  className="flex min-h-[84px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-card p-3 text-center ring-1 ring-line/80 shadow-2xs transition-all duration-200 hover:ring-brand/40 hover:shadow-xs active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className={cn("mb-2 grid h-10 w-10 place-items-center rounded-2xl", opt.tint)}>
                    <opt.Icon size={18} />
                  </span>
                  <span className="text-xs font-bold text-ink">{opt.label}</span>
                  <span className="mt-0.5 text-[10px] text-mute">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Meetup Proposals Inbox */}
            {catchUpsList.length > 0 && (
              <div className="mt-5 border-t border-line/70 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                    <HeartHandshake size={14} className="text-amber-600" />
                    <span>Meetup Proposals &amp; Requests ({catchUpsList.length})</span>
                  </div>
                  <span className="text-[10px] font-bold rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-800">
                    Inbox
                  </span>
                </div>

                <div className="space-y-2.5">
                  {catchUpsList.map((item) => {
                    const eventPayload = {
                      title: `${item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Catch Up"}: ${item.requesterName}`,
                      description: `${item.notes || `AirPal with ${item.requesterName}`}\nVenue: ${item.venue || "TBD"}\nhttps://airpal.me/@${mine?.handle || ""}`,
                      startsAt: `${item.date || toZonedDateStr(new Date())}T${item.time || "14:00"}:00`,
                      venue: item.venue,
                      city: mine?.city || "Sydney",
                      meetingLink: item.meetingLink,
                      meetingPlatform: item.meetingPlatform,
                    };

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-line/80 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
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
                              <p className="font-semibold text-xs text-ink truncate">{item.requesterName}</p>
                              {item.requesterHandle && (
                                <Link
                                  href={`/@${item.requesterHandle}`}
                                  className="text-[11px] text-mute hover:text-accent truncate"
                                >
                                  @{item.requesterHandle}
                                </Link>
                              )}
                            </div>
                            <p className="text-[11px] text-mute truncate mt-0.5">
                              {item.type === "meeting"
                                ? "📅 Meeting"
                                : item.type === "nightout"
                                  ? "👥 Hangout"
                                  : "☕ Catch Up"}
                              {item.date && ` · ${item.date}`}
                              {item.time && ` @ ${item.time}`}
                              {item.venue && ` · ${item.venue}`}
                            </p>
                            {item.notes && <p className="text-[11px] text-ink/80 italic mt-0.5 truncate">"{item.notes}"</p>}
                            <div className="mt-2">
                              <CatchUpSlotActions item={item} />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {item.meetingLink && (
                            <a
                              href={item.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => void triggerHaptic("light")}
                              className={cn(
                                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95 touch-manipulation focus-visible:outline-2 focus-visible:outline-brand",
                                item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                  ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                                  : "bg-brand/10 text-accent ring-1 ring-brand/30 hover:bg-brand/20",
                              )}
                              title={
                                item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                  ? "Open FaceTime call"
                                  : "Join Google Meet video call"
                              }
                            >
                              {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime") ? (
                                <PhoneCall size={13} className="text-emerald-700" />
                              ) : (
                                <Video size={13} className="text-accent" />
                              )}
                              <span>
                                {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                  ? "FaceTime"
                                  : "Google Meet"}
                              </span>
                            </a>
                          )}
                          <AddToCalendarMenu
                            event={eventPayload}
                            size="sm"
                            variant="ghost"
                            label="Sync to Phone"
                            buttonClassName="h-8 px-2.5 text-[11px] rounded-full border border-line"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="relative h-8 w-8 p-0 rounded-full text-mute hover:text-ink hover:bg-black/5 after:absolute after:-inset-2 after:content-['']"
                            onClick={() => {
                              updateCatchUpStatus(item.id, "dismissed");
                              setCatchUpsList((prev) => prev.filter((i) => i.id !== item.id));
                              toast.info("Request dismissed");
                            }}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Public Plans & Hangouts Section */}
            <div className="mt-5 border-t border-line/70 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  <Sparkles size={13} className="text-accent" />
                  <span>Your Public Plans &amp; Hangouts ({myPublicPlans.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => nav("/plan/new")}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-accent hover:bg-brand/20 transition"
                >
                  <Plus size={11} />
                  <span>New Plan</span>
                </button>
              </div>

              {myPublicPlans.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myPublicPlans.map((plan) => {
                    const planEventPayload = {
                      title: plan.title,
                      description: `${plan.notes || `AirPal Public Plan`}\nhttps://airpal.me/plan/${plan.id}`,
                      startsAt: `${plan.date}T${plan.time || "12:00"}:00`,
                      venue: plan.destination || plan.city,
                      city: plan.city,
                    };

                    return (
                      <div
                        key={plan.id}
                        className="flex flex-col justify-between rounded-2xl bg-card p-3.5 ring-1 ring-line shadow-2xs transition-all hover:ring-brand/40"
                      >
                        <PlanGridCard plan={plan} />
                        <div className="mt-2.5 pt-2.5 border-t border-line/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-mute">
                            {plan.destination || plan.city || "Sydney"}
                          </span>
                          <AddToCalendarMenu
                            event={planEventPayload}
                            size="sm"
                            variant="ghost"
                            label="Sync to Phone"
                            buttonClassName="h-7 px-2.5 text-[10px] rounded-full border border-line"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-4 text-center">
                  <p className="text-xs text-mute">You don't have any public plans yet.</p>
                  <button
                    type="button"
                    onClick={() => nav("/plan/new")}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent underline"
                  >
                    Create a public hangout plan →
                  </button>
                </div>
              )}
            </div>
          </section>
          {mine && (
            <Section title="My Bio">
              <Row
                kicker="Public bio"
                title={`@${mine.handle} — how the world sees you`}
                action="View"
                onClick={() => nav(bioPath(mine.handle))}
              />
              <Row
                kicker="Edit"
                title="Photo, links, catalog, story"
                action="Open"
                onClick={() => nav("/bio/edit")}
              />
            </Section>
          )}

          <Section title="Plans">
            <Row kicker="Plan" title="Make one with family and friends" action="Create" onClick={() => nav("/plan/new")} />
            <Row kicker="Trips" title="Your plans and invites" action="Open" onClick={() => nav("/plan")} />
          </Section>

          <Section title="Wallet">
            <Row
              kicker="Tickets"
              title="Your AirPal Wallet — every ticket in one place"
              action="Open"
              onClick={() => nav("/me/tickets")}
            />
          </Section>

          <PayoutSetupCard />
          <BookingsSection />

          <Section title="Business">
            <Row
              kicker="Host"
              title={user.propertyIds?.length ? "Your place" : "List a hotel, venue, or campus"}
              action={user.propertyIds?.length ? "Open" : "Add"}
              onClick={() => nav("/host")}
            />
            <Row
              kicker={NAMES.partnerAccount}
              title={business ? `@${business.handle}` : "Same login. Guests find your place"}
              action={business ? "Open" : "Add"}
              onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: Boolean(business) }))}
            />
            <Row
              kicker="Event"
              title="Ticketed public night or experience"
              action="Create"
              onClick={() => nav("/event/new")}
            />
          </Section>

          <Section title="Belong">
            <Row kicker="Inbox" title="Announcements, plans, alerts" action="Open" onClick={() => nav("/me/inbox")} />
          </Section>

          <Section title="Play & keepsakes">
            <Row
              kicker="Calendar"
              title={goingCount > 0 ? `${goingCount} Going · ${interestedCount} Interested` : "What's on & RSVP schedule"}
              action="Open"
              onClick={() => nav("/calendar")}
            />
            <Row
              kicker="Keepsakes"
              title={
                memoryCount > 0 ? `${memoryCount} ${memoryCount === 1 ? "memory" : "memories"} on the wall` : "Memory Wall"
              }
              action={memoryCount > 0 ? "Open" : "Add"}
              onClick={() => nav("/me/memories")}
            />
          </Section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Saved events</h2>
              <button
                type="button"
                onClick={() => nav("/calendar")}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold transition hover:ring-brand/40 hover:text-accent"
              >
                Open Calendar →
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {savedEvents.map((e) => (
                <li key={e.eventId}>
                  <button
                    type="button"
                    onClick={() => nav(`/calendar?event=${e.eventId}`)}
                    className="w-full rounded-2xl ring-1 ring-line bg-card px-4 py-3 text-left transition hover:ring-brand/40 active:scale-[0.99]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {EVENT_FLAVOUR_LABELS[e.flavour]}
                    </p>
                    <p className="font-medium text-ink">{e.name}</p>
                  </button>
                </li>
              ))}
              {savedEvents.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-mute">
                  No saved events yet. Browse the{" "}
                  <button type="button" onClick={() => nav("/calendar")} className="font-medium text-accent underline">
                    Event Calendar
                  </button>
                  .
                </p>
              )}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Saved stalls</h2>
            <ul className="mt-3 space-y-2">
              {savedStalls.map((s) => (
                <li key={s.stallId}>
                  <button
                    type="button"
                    onClick={() => {
                      const stall = stalls.find((row) => row.id === s.stallId);
                      nav(hrefForStall(stall || { id: s.stallId, eventId: s.eventId, handle: s.handle }));
                    }}
                    className="w-full rounded-2xl ring-1 ring-line bg-card px-4 py-3 text-left transition hover:ring-brand/40 active:scale-[0.99]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {[s.booth || "—", s.location].filter(Boolean).join(" · ")} · {getEvent(s.eventId)?.name || s.eventId}
                    </p>
                    <p className="font-medium text-ink">{s.name}</p>
                    {s.offer && <p className="text-[13px] text-accent">{s.offer}</p>}
                  </button>
                </li>
              ))}
              {savedStalls.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-mute">
                  Scan a gate. Save a stall.
                </p>
              )}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => void logout().then(() => nav("/"))}
            className={cn(
              "flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-full border border-red-600/50 bg-card px-4 py-3 text-sm font-semibold text-red-600 transition shadow-2xs",
              "hover:bg-red-600 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
              "dark:text-red-400 dark:hover:text-white",
            )}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Meet & Hangout Propose Modal */}
      {mine && (
        <BioCatchUpModal
          open={catchUpModalOpen}
          onClose={() => setCatchUpModalOpen(false)}
          handle={mine.handle}
          name={mine.name || user.displayName || "Me"}
          city={mine.city || "Sydney"}
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
