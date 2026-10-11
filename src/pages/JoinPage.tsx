import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCohort } from "@/contexts/CohortContext";
import { triggerHaptic } from "@/lib/native";

export function JoinPage() {
  const params = useParams<{ code?: string }>();
  const [, nav] = useLocation();
  const { activeCohort, isCohortMember, joinCohort, leaveCohort, availableInstitutions } = useCohort();

  const [inputCode, setInputCode] = useState(params.code || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinedSuccess, setJoinedSuccess] = useState<string | null>(null);

  // If URL has a cohort code, auto-join on mount
  useEffect(() => {
    if (params.code) {
      const outcome = joinCohort(params.code);
      if (outcome.success && outcome.institution) {
        setJoinedSuccess(outcome.institution.name);
      } else {
        setErrorMessage(outcome.message);
      }
    }
  }, [params.code, joinCohort]);

  const handleJoin = (codeToJoin: string) => {
    void triggerHaptic("medium");
    setErrorMessage(null);
    const outcome = joinCohort(codeToJoin);
    if (outcome.success && outcome.institution) {
      setJoinedSuccess(outcome.institution.name);
      setTimeout(() => {
        nav("/now");
      }, 1200);
    } else {
      setErrorMessage(outcome.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 md:py-14">
      {/* Header */}
      <header className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1 text-xs font-bold text-accent">
          <Sparkles size={13} />
          <span>AirPal Arrival Engine</span>
        </div>
        <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          I Just Got Here
        </h1>
        <p className="mt-2 text-base text-mute">
          Enter your building or college code to connect with your verified cohort, join hosted events, and make plans in under a minute.
        </p>
      </header>

      {/* Active Cohort State */}
      {isCohortMember && activeCohort && (
        <div className="mt-6 overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm text-center">
          <div className="text-4xl">{activeCohort.badgeEmoji}</div>
          <h2 className="font-display mt-2 text-xl font-bold text-ink">{activeCohort.name}</h2>
          <p className="mt-1 text-xs text-mute">{activeCohort.address}</p>
          <p className="mt-3 text-sm text-ink/80">{activeCohort.welcomeMessage}</p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="w-full sm:w-auto"
              variant="primary"
              onClick={() => {
                void triggerHaptic("light");
                nav("/now");
              }}
            >
              <span>{activeCohort.shortName} Experiences</span>
              <ArrowRight size={16} />
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="ghost"
              onClick={() => {
                void triggerHaptic("light");
                nav("/circle");
              }}
            >
              <span>View Building Circle</span>
            </Button>
            <Button
              className="w-full sm:w-auto text-mute hover:text-ink"
              variant="ghost"
              onClick={() => {
                leaveCohort();
                setJoinedSuccess(null);
              }}
            >
              Switch Building
            </Button>
          </div>
        </div>
      )}

      {/* Join Form */}
      {(!isCohortMember || !activeCohort) && (
        <div className="mt-8 rounded-3xl bg-card p-6 sm:p-8 ring-1 ring-line shadow-xs">
          <h2 className="font-display text-lg font-bold text-ink">Enter Building or College Code</h2>
          <p className="mt-1 text-xs text-mute">
            Found on your room welcome card, move-in key pack, or lobby QR poster.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(inputCode);
            }}
            className="mt-4 flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setErrorMessage(null);
              }}
              placeholder="e.g. SCAPE26, STPAULS"
              className="h-12 flex-1 rounded-2xl bg-paper px-4 text-sm font-semibold uppercase tracking-wider text-ink ring-1 ring-line/80 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <Button
              type="submit"
              className="h-12 min-w-[120px]"
              variant="primary"
            >
              Join Cohort
            </Button>
          </form>

          {errorMessage && (
            <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          )}

          {joinedSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Joined {joinedSuccess}! Taking you to your daily plans…</span>
            </div>
          )}

          {/* Seed Beachhead Quick Selector */}
          <div className="mt-8 border-t border-line/60 pt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">
              Or tap a featured Sydney partner
            </span>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableInstitutions.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => handleJoin(inst.code)}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-paper/60 p-3 text-left transition hover:border-brand/40 hover:bg-card active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-2xl shrink-0">{inst.badgeEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink truncate">{inst.name}</p>
                    <p className="text-[11px] text-mute">{inst.code} · {inst.city}</p>
                  </div>
                  <ArrowRight size={14} className="text-mute shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* General Public Link */}
      <div className="mt-8 text-center">
        <p className="text-xs text-mute">
          Not staying in a partner college or hotel?{" "}
          <button
            type="button"
            onClick={() => nav("/now")}
            className="font-semibold text-accent underline cursor-pointer"
          >
            Explore Sydney as a general guest
          </button>
        </p>
      </div>
    </div>
  );
}
