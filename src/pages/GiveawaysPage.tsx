import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Clock, Gift, MapPin, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getFirebaseDb } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import { PROMOTION_CATEGORIES, type Promotion } from "@shared/promotions";

function closingLabel(p: Promotion): string {
  if (!p.endAt) return "";
  const ms = Date.parse(p.endAt) - Date.now();
  if (ms <= 0) return "Closed";
  const days = Math.floor(ms / 86400000);
  if (days >= 2) return `Closes ${new Date(p.endAt).toLocaleDateString()}`;
  const hours = Math.max(1, Math.floor(ms / 3600000));
  return days >= 1 ? "Closes tomorrow" : `Closes in ${hours}h`;
}

function Card({ p, featured }: { p: Promotion; featured?: boolean }) {
  const closed = p.status === "closed" || (p.endAt && Date.parse(p.endAt) <= Date.now());
  return (
    <Link
      href={`/giveaways/${p.id}`}
      className={cn(
        "block overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-sm transition-transform hover:-translate-y-0.5",
        featured && "border-gold",
      )}
    >
      {p.heroImage ? (
        <img src={p.heroImage} alt={p.title} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div
          className={cn(
            "grid h-40 w-full place-items-center",
            featured ? "bg-gradient-to-br from-gold/30 via-amber-100 to-brand/20" : "bg-gradient-to-br from-brand/15 via-sky-100 to-emerald-100",
          )}
        >
          {closed ? <Trophy size={40} className="text-gold" /> : <Gift size={40} className="text-brand" />}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className={cn("rounded-full px-2 py-0.5", closed ? "bg-ink/10 text-mute" : "bg-emerald-500/10 text-emerald-700")}>
            {closed ? "Closed" : p.status === "live" ? "Open" : "Coming soon"}
          </span>
          {p.category && <span className="text-mute">{p.category}</span>}
        </div>
        <h3 className="font-display mt-1.5 text-lg font-bold leading-snug">{p.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-mute">{p.prize.title || p.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          {p.prizeValue && <span className="font-semibold text-ink">{p.prizeValue}</span>}
          <span className="inline-flex items-center gap-1"><Clock size={12} />{closingLabel(p)}</span>
          {p.locationText && (
            <span className="inline-flex items-center gap-1"><MapPin size={12} />{p.locationText}</span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-mute">by {p.sponsorName}</p>
        <div className="mt-3">
          <span
            className={cn(
              "inline-block rounded-xl px-4 py-2 text-sm font-bold",
              closed ? "bg-ink/10 text-mute" : "bg-brand text-white",
            )}
          >
            {closed ? "View giveaway" : p.status === "live" ? "Enter now" : "Coming soon"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function GiveawaysPage() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    void getDocs(
      query(collection(db, "promotions"), where("kind", "==", "giveaway"), where("status", "in", ["live", "closed", "scheduled", "approved"])),
    )
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
        list.sort((a, b) => (a.endAt || "").localeCompare(b.endAt || ""));
        setRows(list);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category === "All" ? rows : rows.filter((r) => r.category === category)),
    [rows, category],
  );
  const now = Date.now();
  const isOpen = (p: Promotion) => p.status === "live" && (!p.endAt || Date.parse(p.endAt) > now);
  const featured = filtered.find((p) => p.featured && isOpen(p)) || filtered.find(isOpen);
  const rest = filtered.filter((p) => p !== featured);
  const endingSoon = rest.filter((p) => isOpen(p) && p.endAt && Date.parse(p.endAt) - now < 3 * 86400000);
  const active = rest.filter((p) => isOpen(p) && !endingSoon.includes(p));
  const upcoming = filtered.filter((p) => p.status === "scheduled" || p.status === "approved");
  const winners = filtered.filter((p) => p.status === "closed");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Explore
      </Link>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
        <Sparkles size={13} /> AirPal Giveaways
      </p>
      <h1 className="font-display mt-1 text-3xl font-bold">Discover. Experience. Win.</h1>
      <p className="mt-1 text-sm text-mute">
        Real experiences from local partners. Free to enter — entry never guarantees winning.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {["All", ...PROMOTION_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold",
              category === c ? "border-ink bg-ink text-white" : "border-ink/15 bg-card",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading giveaways…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <Gift size={32} className="mx-auto text-mute" />
          <p className="font-display mt-2 text-lg font-bold">No giveaways available right now.</p>
          <p className="mt-1 text-sm text-mute">Check back soon for the next AirPal Weekly.</p>
          <Link href="/promotions">
            <Button className="mt-4">Browse promotions</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {featured && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">Featured</h2>
              <Card p={featured} featured />
            </section>
          )}
          {endingSoon.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">Ending soon</h2>
              <div className="space-y-4">{endingSoon.map((p) => <Card key={p.id} p={p} />)}</div>
            </section>
          )}
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">Active giveaways</h2>
              <div className="space-y-4">{active.map((p) => <Card key={p.id} p={p} />)}</div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">Upcoming</h2>
              <div className="space-y-4">{upcoming.map((p) => <Card key={p.id} p={p} />)}</div>
            </section>
          )}
          {winners.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute">
                <Trophy size={13} /> Previous winners
              </h2>
              <div className="space-y-4">{winners.map((p) => <Card key={p.id} p={p} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
