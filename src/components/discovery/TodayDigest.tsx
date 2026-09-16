import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { CalendarDays, Sparkles, Tag, Users } from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase";

/**
 * AirPal Daily digest: not a news product, the discovery layer.
 * "What's happening near you" — every tile feeds a marketplace surface.
 */
export function TodayDigest({
  tonightCount,
  liveCount,
  dealsCount,
  plansCount,
  onShowDeals,
}: {
  tonightCount: number;
  liveCount: number;
  dealsCount: number;
  plansCount: number;
  onShowDeals: () => void;
}) {
  const [, nav] = useLocation();
  const [experiences, setExperiences] = useState(0);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    void getDocs(query(collection(db, "campaigns"), where("status", "==", "live"), limit(20)))
      .then((snap) => setExperiences(snap.size))
      .catch(() => undefined);
  }, []);

  const tiles = [
    {
      icon: CalendarDays,
      count: tonightCount,
      label: tonightCount === 1 ? "event tonight" : "events tonight",
      sub: liveCount > 0 ? `${liveCount} on right now` : "see what's on",
      onClick: () => nav("/calendar"),
    },
    {
      icon: Sparkles,
      count: experiences,
      label: experiences === 1 ? "experience live" : "experiences live",
      sub: "hosted with local venues",
      onClick: () => nav("/experiences"),
    },
    {
      icon: Tag,
      count: dealsCount,
      label: dealsCount === 1 ? "deal nearby" : "deals nearby",
      sub: "redeem with a QR",
      onClick: onShowDeals,
    },
    {
      icon: Users,
      count: plansCount,
      label: plansCount === 1 ? "public plan" : "public plans",
      sub: "join or take a Mate",
      onClick: () => nav("/plan"),
    },
  ];

  if (tonightCount + experiences + dealsCount + plansCount === 0) return null;

  return (
    <section aria-label="Tonight near you" className="mt-6 px-4 md:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold">Tonight near you</h2>
        <Link href="/mate/request" className="text-[13px] font-semibold text-brand">
          Need company? →
        </Link>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <button
              onClick={t.onClick}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left hover:border-mute"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <t.icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight">
                  {t.count} <span className="text-[13px] font-semibold">{t.label}</span>
                </span>
                <span className="block truncate text-xs text-mute">{t.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
