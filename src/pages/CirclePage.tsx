import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { useCohort } from "@/contexts/CohortContext";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { CIRCLE_QUESTS, circleHandles, circleQuestProgress, hasMarkedCircleInvite } from "@/lib/circle";
import { listPeople } from "@/lib/people";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function CirclePage() {
  const { mine } = useBio();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const { activeCohort } = useCohort();
  const [, nav] = useLocation();
  const [showQuests, setShowQuests] = useState(false);

  const met = useMemo(
    () =>
      new Set(
        listPeople()
          .map((p) => (p.handle || "").toLowerCase())
          .filter(Boolean),
      ),
    [],
  );

  const circleMembers = useMemo(() => {
    return circleHandles({
      following: followedHandles,
      followers: followerHandles,
      liked: likedHandles,
      likedBy: likedByHandles,
      met,
    });
  }, [followedHandles, followerHandles, likedHandles, likedByHandles, met]);

  const quest = useMemo(() => {
    return circleQuestProgress({
      hasHandle: Boolean(mine?.handle),
      sharingCity: Boolean(mine?.city),
      invited: hasMarkedCircleInvite(),
      memberCount: circleMembers.length,
      planCount: 1,
    });
  }, [mine?.handle, mine?.city, circleMembers.length]);

  const handleShareCircleInvite = () => {
    void triggerHaptic("medium");
    const url = mine?.handle
      ? `${window.location.origin}/@${mine.handle}`
      : `${window.location.origin}/start`;
    void navigator.clipboard.writeText(url);
    toast.success("Circle invite link copied to clipboard!");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28 sm:px-6 sm:pb-32">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            <Users size={13} />
            <span>Networking Circle</span>
          </div>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            My Circle
          </h1>
          <p className="mt-1 text-sm text-mute">
            Your trusted real-world network — friends, cohort neighbors, and people you&apos;ve completed plans with.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleShareCircleInvite}
            className="min-h-[44px] gap-1.5 px-4 text-xs font-semibold shadow-xs active:scale-95"
          >
            <UserPlus size={15} />
            <span>Invite to Circle</span>
          </Button>
        </div>
      </header>

      {/* Real-World Social Level / Quests */}
      <div className="mt-6 rounded-3xl bg-gradient-to-r from-card via-card to-paper p-5 ring-1 ring-line shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-xl font-bold text-accent">
              ⚡
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-mute">Connector Rank</p>
              <h3 className="font-display text-base font-bold text-ink">
                Level {quest.level.rank} · {quest.level.name}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-accent">{quest.points} pts</span>
            <p className="text-[11px] text-mute">{quest.completed} of {quest.total} quests done</p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line/80">
          <div
            className="h-full bg-brand transition-all duration-500 rounded-full"
            style={{ width: `${Math.round((quest.completed / quest.total) * 100)}%` }}
          />
        </div>

        <div className="mt-3.5 flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setShowQuests((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
          >
            <span>{showQuests ? "Hide Quests" : "View Quests & Rewards"}</span>
            {showQuests ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <span className="text-[11px] font-medium text-mute">
            {quest.completed === quest.total ? "All completed! 🎉" : `${quest.total - quest.completed} quests remaining`}
          </span>
        </div>

        {showQuests && (
          <div className="mt-4 space-y-2 border-t border-line/70 pt-3">
            {CIRCLE_QUESTS.map((q) => {
              const isDone = quest.done[q.id];
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-paper/60 p-2.5 ring-1 ring-line/50 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                        isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 text-accent",
                      )}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : `+${q.points}`}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("font-bold truncate", isDone ? "text-ink/80 line-through" : "text-ink")}>
                        {q.title}
                      </p>
                      <p className="text-[11px] text-mute truncate">{q.hint}</p>
                    </div>
                  </div>

                  {!isDone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs h-7 px-2.5 py-0"
                      onClick={() => {
                        void triggerHaptic("light");
                        if (q.id === "handle") nav("/bio/setup");
                        else if (q.id === "city") nav("/bio/edit");
                        else if (q.id === "invite") handleShareCircleInvite();
                        else if (q.id === "people") nav("/now");
                        else if (q.id === "plan") nav("/plan/new");
                      }}
                    >
                      Start →
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-Time "Here" Check-In Board */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            <span>Live Presence & Catchups</span>
          </h2>
          <span className="text-xs text-mute">Visible to Circle only</span>
        </div>
        <HereCheckIn placeName={activeCohort?.name || mine?.city || "Sydney Hub"} />
      </div>

      {/* Cohort Quick Link if active */}
      {activeCohort && (
        <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{activeCohort.badgeEmoji}</span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-ink truncate">{activeCohort.name} Cohort</h4>
              <p className="text-[11px] text-mute">Connect with building neighbors & floor mates</p>
            </div>
          </div>
          <Link
            href="/join"
            className="shrink-0 inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-card ring-1 ring-line active:scale-95 transition"
          >
            Building Hub →
          </Link>
        </div>
      )}

      {/* Circle Members List */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-ink">
            Circle Network ({circleMembers.length})
          </h2>
          <Link
            href="/plan/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            <Plus size={13} />
            <span>Plan with Circle</span>
          </Link>
        </div>

        {circleMembers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/60 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-accent">
              <Users size={24} />
            </div>
            <h3 className="font-display mt-3 text-base font-bold text-ink">
              Your circle starts here
            </h3>
            <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
              Add mates by sharing your plan links, meeting up at events, or connecting with people from your building cohort.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Button
                variant="primary"
                onClick={handleShareCircleInvite}
                className="min-h-[44px] px-4 text-xs font-semibold shadow-xs active:scale-95"
              >
                Share My Handle Link
              </Button>
              <Button
                variant="ghost"
                onClick={() => nav("/now")}
                className="min-h-[44px] px-4 text-xs font-semibold active:scale-95"
              >
                Find Experiences
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {circleMembers.map((handle) => (
              <div
                key={handle}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-line shadow-xs transition hover:bg-paper/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 font-bold text-accent shrink-0">
                    @{handle.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/@${handle}`}
                      className="font-bold text-sm text-ink hover:underline truncate block"
                    >
                      @{handle}
                    </Link>
                    <p className="text-[11px] text-mute">In your trusted circle</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/plan/new?dest=@${handle}&title=${encodeURIComponent(`Hangout with @${handle}`)}`}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition shadow-2xs"
                  >
                    Plan Hangout
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fast CTA */}
      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Need a quick plan with friends?</h3>
          <p className="text-xs text-mute mt-0.5">Assemble a plan in 60s and send a one-tap RSVP link to your circle.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => nav("/plan/new")}
          className="shrink-0 min-h-[44px] px-5 text-xs font-semibold shadow-xs active:scale-95"
        >
          Create Hangout Plan
        </Button>
      </div>
    </div>
  );
}
