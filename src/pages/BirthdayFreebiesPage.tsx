import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Cake, ExternalLink, Gift, Lock, Users } from "lucide-react";
import {
  BIRTHDAY_DISCLAIMER,
  BIRTHDAY_MATE_CTA,
  BIRTHDAY_MONTHS,
  BIRTHDAY_REGIONS,
  isBirthdayRegionCode,
  type BirthdayOffer,
  type BirthdayRegionCode,
} from "@shared/birthday-freebies";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyBirthdayError, listBirthdayOffersRemote } from "@/lib/birthday-freebies";
import { liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function BirthdayFreebiesPage() {
  const params = useParams<{ region?: string }>();
  const { user, authReady, requireUser } = useAuth();
  const regionParam = String(params.region || "au").toLowerCase();
  const region: BirthdayRegionCode = isBirthdayRegionCode(regionParam) ? regionParam : "au";

  const defaultMonth = user?.birthdayMonth && user.birthdayMonth >= 1 && user.birthdayMonth <= 12
    ? user.birthdayMonth
    : currentMonth();

  const [month, setMonth] = useState(defaultMonth);
  const [offers, setOffers] = useState<BirthdayOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdult = Boolean(user?.adultConsent || user?.adultConfirmed);

  useEffect(() => {
    if (user?.birthdayMonth && user.birthdayMonth >= 1 && user.birthdayMonth <= 12) {
      setMonth(user.birthdayMonth);
    }
  }, [user?.birthdayMonth]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (!liveBackendEnabled()) {
      setOffers([]);
      setLoading(false);
      setError("Connect Firebase to load live birthday freebies.");
      return;
    }
    void listBirthdayOffersRemote({ region, month, status: "live" })
      .then((res) => {
        if (!cancelled) setOffers(res.offers || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setOffers([]);
          setError(friendlyBirthdayError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, month]);

  const visible = useMemo(() => {
    return offers.filter((o) => {
      if (o.adultOnly && !isAdult) return false;
      return true;
    });
  }, [offers, isAdult]);

  const gatedCount = offers.filter((o) => o.adultOnly && !isAdult).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Cake size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Birthday freebies</h1>
          <p className="mt-1 text-sm text-mute">
            Loyalty birthday rewards by month — redeem with a Mate. Life Made Easy.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {BIRTHDAY_REGIONS.map((r) => (
          <Link
            key={r.code}
            href={`/birthday-freebies/${r.code}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
              r.code === region ? "bg-brand text-white ring-brand" : "bg-card text-ink ring-line hover:bg-paper",
            )}
          >
            {r.flagEmoji ? `${r.flagEmoji} ` : ""}
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-mute">Birthday month</label>
        <select
          className="mt-1 w-full rounded-2xl bg-card px-3 py-2.5 text-sm ring-1 ring-line"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {BIRTHDAY_MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {user?.birthdayMonth ? (
          <p className="mt-1 text-[11px] text-mute">Defaulted to your birthday month ({user.birthdayMonth}).</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl bg-brand/5 p-3 ring-1 ring-brand/15">
        <p className="text-xs leading-relaxed text-ink">
          <Users size={14} className="mr-1 inline text-brand" />
          {BIRTHDAY_MATE_CTA.blurb} Sydney is home base; other regions help travelers plan Mate meetups abroad.
        </p>
        <Link href={BIRTHDAY_MATE_CTA.inAppHref} className="mt-2 inline-flex text-xs font-bold text-brand">
          Find a Mate →
        </Link>
      </div>

      {loading || !authReady ? (
        <p className="mt-8 text-center text-sm text-mute">Loading freebies…</p>
      ) : error ? (
        <p className="mt-8 text-center text-sm text-mute">{error}</p>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/15 p-8 text-center">
          <Gift size={28} className="mx-auto text-mute" />
          <p className="font-display mt-2 text-lg font-bold">No freebies for this month yet</p>
          <p className="mt-1 text-sm text-mute">Try another month or region — catalogs grow with Mate meetups.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((o) => (
            <article key={o.id} className="rounded-2xl bg-card p-4 ring-1 ring-line">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mute ring-1 ring-line">
                  {o.category}
                </span>
                {o.featured ? (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    Featured
                  </span>
                ) : null}
                {o.editorial ? (
                  <span className="text-[10px] text-mute">Editorial</span>
                ) : null}
              </div>
              <h2 className="mt-2 font-display text-lg font-bold">{o.brand}</h2>
              <p className="text-sm font-semibold text-ink">{o.title}</p>
              <p className="mt-1 text-sm text-brand">{o.rewardText}</p>
              <p className="mt-2 text-xs leading-relaxed text-mute">{o.howToClaim}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={BIRTHDAY_MATE_CTA.inAppHref}>
                  <Button size="sm">
                    <Users size={14} /> {BIRTHDAY_MATE_CTA.label}
                  </Button>
                </Link>
                {o.claimUrl ? (
                  <a href={o.claimUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <ExternalLink size={14} /> Brand site
                    </Button>
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {gatedCount > 0 && !isAdult ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
          <Lock size={16} className="mt-0.5 shrink-0 text-mute" />
          <div className="text-xs text-mute">
            <p className="font-semibold text-ink">{gatedCount} adult-only offers hidden</p>
            <p className="mt-0.5">Sign in with Adult 18+ confirmation to see them.</p>
            <button
              type="button"
              className="mt-1 font-bold text-brand"
              onClick={() => requireUser("Sign in to view adult birthday offers.")}
            >
              Sign in →
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-[11px] leading-relaxed text-mute">{BIRTHDAY_DISCLAIMER}</p>
    </div>
  );
}
