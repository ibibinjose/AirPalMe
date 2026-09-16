import { useLocation } from "wouter";
import { ImageField } from "@/components/media/ImageField";
import { EVENT_FLAVOUR_LABELS } from "@shared/event";
import { hrefForStall } from "@/lib/bio-handle";
import { bioPath } from "@shared/bio";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";
import { useClub } from "@/contexts/ClubContext";
import { useZoo } from "@/contexts/ZooContext";
import { huntProgress } from "@shared/zoo";
import { loadHunts } from "@/lib/hunts-store";
import { listMemories } from "@/lib/memories";
import { listPeople } from "@/lib/people";


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
      className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
    >
      <span>
        <span className="block text-[12px] text-mute">{kicker}</span>
        <span className="font-medium">{title}</span>
      </span>
      <span className="text-sm text-brand">{action}</span>
    </button>
  );
}

export function MePage() {
  const [, nav] = useLocation();
  const { user, logout, sendVerificationEmail } = useAuth();
  const { mine, business, updateProfile } = useBio();
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
    <div className="mx-auto max-w-lg px-4 pb-10">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Profile</p>

      <div className="mt-4 flex flex-col items-center text-center">
        <ImageField
          kind="avatar"
          round
          align="center"
          previewClassName="h-28 w-28"
          value={mine?.avatar}
          onChange={(src) => void onAvatar(src)}
        />
        <h1 className="font-display mt-4 text-3xl font-semibold">{user.displayName || mine?.name || "Account"}</h1>
        <p className="mt-1 text-sm text-mute">{mine ? `@${mine.handle}` : "No @handle yet"}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}>
            {mine ? "Edit profile" : "Choose @handle"}
          </Button>
          {mine && (
            <Button size="sm" variant="ghost" onClick={() => nav(bioPath(mine.handle))}>
              Public bio
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => nav("/settings")}>
            Settings
          </Button>
        </div>
      </div>

      <AccountContacts compact />
      {user.email && user.emailVerified === false && <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />}

      <h2 className="font-display mt-8 text-xl">Workspace</h2>
      <div className="mt-3 space-y-2">
        <Row
          kicker="Air Zoo"
          title={zooProgress.have ? zooProgress.label : "Stickers, shops, hunts"}
          action="Open"
          onClick={() => nav("/me/zoo")}
        />
        <Row
          kicker="Host"
          title={user.propertyIds?.length ? "Your place" : "List a hotel, venue, or campus"}
          action={user.propertyIds?.length ? "Open" : "Add"}
          onClick={() => nav("/host")}
        />
        <Row
          kicker="Business"
          title={business ? `@${business.handle}` : "Local listing"}
          action={business ? "Open" : "Add"}
          onClick={() => nav(business ? "/business" : "/bio/setup?kind=business")}
        />
        <Row kicker="Event" title="Market, expo, festival" action="Open" onClick={() => nav("/event")} />
        <Row
          kicker="Calendar"
          title={goingCount > 0 ? `${goingCount} Going · ${interestedCount} Interested` : "What's on & RSVP schedule"}
          action="Open"
          onClick={() => nav("/calendar")}
        />
        <Row
          kicker="AirPal Club"
          title={club ? "Invites and offers on" : "Join for invites and offers"}
          action={club ? "Open" : "Join"}
          onClick={() => nav("/club")}
        />
        <Row
          kicker="Companion"
          title="Become an AirPal — friend, teammate, companion"
          action="Apply"
          onClick={() => nav("/companion")}
        />
        <Row
          kicker="Networking"
          title={peopleCount > 0 ? `Circle · ${peopleCount} met` : "Circle — met, following, likes"}
          action="Open"
          onClick={() => nav("/circle")}
        />
        <Row
          kicker="Keepsakes"
          title={memoryCount > 0 ? `${memoryCount} ${memoryCount === 1 ? "memory" : "memories"} on the wall` : "Memory Wall"}
          action={memoryCount > 0 ? "Open" : "Add"}
          onClick={() => nav("/me/memories")}
        />
        {business && (
          <Row kicker="Guest list" title="Email the door" action="Open" onClick={() => nav("/club/list")} />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl">Saved events</h2>
        <button
          type="button"
          onClick={() => nav("/calendar")}
          className="text-xs font-medium text-brand hover:underline"
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
              className="w-full rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line hover:shadow-xs transition"
            >
              <p className="text-[12px] text-mute">{EVENT_FLAVOUR_LABELS[e.flavour]}</p>
              <p className="font-medium">{e.name}</p>
            </button>
          </li>
        ))}
        {savedEvents.length === 0 && (
          <p className="text-sm text-mute">
            No saved events yet. Browse the{" "}
            <button
              type="button"
              onClick={() => nav("/calendar")}
              className="text-brand underline"
            >
              Event Calendar
            </button>
            .
          </p>
        )}
      </ul>

      <h2 className="font-display mt-8 text-xl">Saved stalls</h2>
      <ul className="mt-3 space-y-2">
        {savedStalls.map((s) => (
          <li key={s.stallId}>
            <button
              type="button"
              onClick={() => {
                const stall = stalls.find((row) => row.id === s.stallId);
                nav(hrefForStall(stall || { id: s.stallId, eventId: s.eventId, handle: s.handle }));
              }}
              className="w-full rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
            >
              <p className="text-[12px] text-mute">
                {s.booth || "—"} · {getEvent(s.eventId)?.name || s.eventId}
              </p>
              <p className="font-medium">{s.name}</p>
              {s.offer && <p className="text-[13px] text-gold">{s.offer}</p>}
            </button>
          </li>
        ))}
        {savedStalls.length === 0 && <p className="text-sm text-mute">Scan a gate. Save a stall.</p>}
      </ul>

      <button type="button" className="mt-8 text-sm text-mute" onClick={() => void logout().then(() => nav("/"))}>
        Sign out
      </button>
    </div>
  );
}
