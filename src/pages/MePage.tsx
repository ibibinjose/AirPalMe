import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ImageField } from "@/components/media/ImageField";
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
import { useClub } from "@/contexts/ClubContext";
import { useZoo } from "@/contexts/ZooContext";
import { huntProgress } from "@shared/zoo";
import { loadHunts } from "@/lib/hunts-store";
import { listMemories } from "@/lib/memories";
import { listPeople } from "@/lib/people";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { BookingsSection } from "@/components/booking/BookingsSection";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
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
      className="flex w-full touch-manipulation items-center justify-between gap-3 rounded-2xl ring-1 ring-line bg-card px-4 py-3 text-left transition hover:ring-brand/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">{kicker}</span>
        <span className="block truncate font-medium">{title}</span>
      </span>
      <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold">{action}</span>
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
  const { memberByEmail } = useClub();
  const { state: zoo } = useZoo();
  const club = user ? memberByEmail(user.email) : undefined;
  const hunts = loadHunts();
  const zooProgress = huntProgress(zoo, hunts[0]?.id || "", hunts);
  const goingCount = calendarEvents.filter((e) => e.isGoing).length;
  const interestedCount = calendarEvents.filter((e) => e.isInterested).length;
  const peopleCount = listPeople().length;
  const memoryCount = listMemories().length;
  const { myPlans } = usePlans();
  const tripCount = myPlans.length;
  const savedCount = savedEvents.length + savedStalls.length;

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
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 md:px-6">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Avatar Hero, Handle, Quick Links & Contacts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[28px] ring-1 ring-line bg-card p-6 text-center shadow-xs">
            <div className="flex flex-col items-center">
              <ImageField
                kind="avatar"
                round
                align="center"
                previewClassName="h-28 w-28"
                value={mine?.avatar}
                onChange={(src) => void onAvatar(src)}
                cornerBadge={mine ? <BioKindIcon kind={mine.kind} /> : undefined}
              />
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
                  className="rounded-full font-semibold"
                  disabled={!mine && !biosReady}
                  onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
                >
                  {mine ? "Edit profile" : biosReady ? "Choose @handle" : "Loading…"}
                </Button>
                {mine && (
                  <Button size="sm" variant="ghost" className="rounded-full border border-line" onClick={() => nav(bioPath(mine.handle))}>
                    Public bio
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="rounded-full border border-line" onClick={() => nav("/settings")}>
                  Settings
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full border border-line" onClick={() => nav("/me/giveaways")}>
                  Giveaways
                </Button>
              </div>
            </div>
          </div>

          {/* Travel identity — a reason to build a profile */}
          <div className="rounded-[28px] ring-1 ring-line bg-card p-5 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Travel identity</p>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { v: String(tripCount), l: "Trips" },
                { v: String(goingCount + interestedCount), l: "Events" },
                { v: String(savedCount), l: "Saved" },
                { v: String(peopleCount), l: "People" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-paper px-1 py-2.5">
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-display text-[19px] font-bold">{s.v}</dd>
                  <dd className="text-[11px] font-medium text-mute">{s.l}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => nav("/plan")}
                className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40"
              >
                Trips
              </button>
              <button
                type="button"
                onClick={() => nav("/me/memories")}
                className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40"
              >
                Moments ({memoryCount})
              </button>
              <button
                type="button"
                onClick={() => nav("/calendar")}
                className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40"
              >
                Events
              </button>
              <button
                type="button"
                onClick={() => nav("/settings")}
                className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line transition hover:ring-brand/40"
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

        {/* Right Column: Activity, Spaces, Belonging, Keepsakes & Saved (7 cols) */}
        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-6">
          <Section title="Activity">
            <Row kicker="Mate" title="Find someone to go with you" action="Open" onClick={() => nav("/mate")} />
            <Row kicker="Requests" title="Your matches, chat and bookings" action="Open" onClick={() => nav("/mate")} />
            <Row
              kicker="Become a Mate"
              title="Apply to go with people — reviewed by AirPal"
              action="Apply"
              onClick={() => nav("/companion")}
            />
            <Row
              kicker="Tickets"
              title="Events and experiences you’ve bought or hosted"
              action="Open"
              onClick={() => nav("/experiences")}
            />
          </Section>

          <PayoutSetupCard />
          <BookingsSection />

          <Section title="Your spaces">
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
            <Row kicker="Plan" title="With family and friends" action="Create" onClick={() => nav("/plan/new")} />
            <Row
              kicker="Event"
              title="Ticketed public night or experience"
              action="Create"
              onClick={() => nav("/event/new")}
            />
            {business && <Row kicker="Guest list" title="Email the door" action="Open" onClick={() => nav("/club/list")} />}
          </Section>

          <Section title="Belong">
            <Row kicker="Inbox" title="Announcements, plans, alerts" action="Open" onClick={() => nav("/me/inbox")} />
            <Row
              kicker="AirPal Club"
              title={club ? "Invites and offers on" : "Join for invites and offers"}
              action={club ? "Open" : "Join"}
              onClick={() => nav("/club")}
            />
            <Row
              kicker="Companion"
              title="AirPal Mate application status"
              action="Open"
              onClick={() => nav("/companion")}
            />
            <Row
              kicker="Circle"
              title={peopleCount > 0 ? `Audience · ${peopleCount} met` : "Your people in one place"}
              action="Open"
              onClick={() => nav("/circle")}
            />
            <Row
              kicker="People met"
              title={
                peopleCount > 0
                  ? `${peopleCount} ${peopleCount === 1 ? "person" : "people"} + catch-ups`
                  : "Log everyone you meet"
              }
              action={peopleCount > 0 ? "Open" : "Add"}
              onClick={() => nav("/me/people")}
            />
          </Section>

          <Section title="Play & keepsakes">
            <Row
              kicker="Air Zoo"
              title={zooProgress.have ? zooProgress.label : "Stickers, shops, hunts"}
              action="Open"
              onClick={() => nav("/me/zoo")}
            />
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
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold transition hover:ring-brand/40 hover:text-brand"
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                      {EVENT_FLAVOUR_LABELS[e.flavour]}
                    </p>
                    <p className="font-medium text-ink">{e.name}</p>
                  </button>
                </li>
              ))}
              {savedEvents.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-mute">
                  No saved events yet. Browse the{" "}
                  <button type="button" onClick={() => nav("/calendar")} className="font-medium text-brand underline">
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                      {s.booth || "—"} · {getEvent(s.eventId)?.name || s.eventId}
                    </p>
                    <p className="font-medium text-ink">{s.name}</p>
                    {s.offer && <p className="text-[13px] text-gold">{s.offer}</p>}
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
              "w-full rounded-full border border-red-600/50 bg-card px-4 py-3 text-sm font-semibold text-red-600 transition",
              "hover:bg-red-600 hover:text-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
              "dark:text-red-400 dark:hover:text-white",
            )}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
