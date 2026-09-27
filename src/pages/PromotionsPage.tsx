import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowLeft,
  BadgePercent,
  Clock,
  MapPin,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Ticket,
  ShieldCheck,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { promoArtFor, seedPromotionDemoRemote } from "@/lib/promotions";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { PROMOTION_CATEGORIES, type Promotion } from "@shared/promotions";
import { SearchBar } from "@/components/search/SearchBar";

export function PromotionsPage() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState<string>("all");
  const [seeding, setSeeding] = useState(false);

  async function loadPromotions() {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(
        query(
          collection(db, "promotions"),
          where("kind", "==", "promotion"),
          where("status", "in", ["live", "closed", "approved"]),
        ),
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
      list.sort((a, b) => (a.endAt || "").localeCompare(b.endAt || ""));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromotions();
  }, []);

  async function handleSeedDemo() {
    setSeeding(true);
    void triggerHaptic("light");
    try {
      const res = await seedPromotionDemoRemote();
      toast.success(`Seeded ${res.created} demo deals & giveaways!`);
      void loadPromotions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed demo deals");
    } finally {
      setSeeding(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Category filter
      if (category !== "All" && r.category !== category) return false;

      // Mechanic filter
      if (mechanicFilter === "discount" && r.mechanicType !== "discount") return false;
      if (mechanicFilter === "offer" && r.mechanicType !== "offer") return false;
      if (mechanicFilter === "reward" && r.mechanicType !== "reward") return false;

      // Search term
      if (search.trim()) {
        const queryLower = search.toLowerCase();
        const titleMatch = r.title.toLowerCase().includes(queryLower);
        const sponsorMatch = (r.sponsorName || "").toLowerCase().includes(queryLower);
        const prizeMatch = (r.prizeValue || "").toLowerCase().includes(queryLower);
        const locMatch = (r.locationText || "").toLowerCase().includes(queryLower);
        const descMatch = (r.description || "").toLowerCase().includes(queryLower);
        if (!titleMatch && !sponsorMatch && !prizeMatch && !locMatch && !descMatch) return false;
      }

      return true;
    });
  }, [rows, category, mechanicFilter, search]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 pb-32">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-mute hover:text-ink transition">
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>

        {/* CRUD Quick Navigation Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/business/promotions/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
          >
            <Plus size={14} />
            <span>Post a Deal</span>
          </Link>

          {user && (
            <Link
              href="/business/promotions"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
            >
              <Store size={14} className="text-brand" />
              <span>My Deals</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/promotions"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gold/15 px-3.5 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-gold/30 hover:bg-gold/25 transition"
            >
              <ShieldCheck size={14} />
              <span>Admin Queue</span>
            </Link>
          )}

          <Link
            href="/giveaways"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <Sparkles size={14} className="text-gold" />
            <span>Giveaways</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/10 via-card to-card p-6 md:p-8 ring-1 ring-line shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-brand uppercase tracking-wider ring-1 ring-brand/25">
            AirPal Deals & Perks
          </span>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-mute ring-1 ring-line">
            Sydney & Local
          </span>
        </div>
        <h1 className="font-display mt-3 text-2xl sm:text-3xl md:text-4xl font-black text-ink tracking-tight">
          Exclusive Deals & Member Offers
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-mute max-w-xl">
          Discounts, dining perks, secret barista codes, and member vouchers verified from local businesses across your city.
        </p>

        {/* Search Bar */}
        <div className="mt-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            sizeVariant="md"
            variant="paper"
            placeholder="Search deals by venue, dish, discount % or location…"
            aria-label="Search deals"
          />
        </div>
      </div>

      {/* Category Pills & Mechanic Filters */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Filter by category">
          {["All", ...PROMOTION_CATEGORIES].map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setCategory(c);
                }}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ring-1",
                  active
                    ? "bg-brand text-white ring-brand shadow-xs"
                    : "bg-card text-ink ring-line hover:bg-paper",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Mechanic Quick Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
          <span className="text-mute text-[11px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={12} />
            <span>Type:</span>
          </span>
          {[
            { id: "all", label: "All Formats" },
            { id: "discount", label: "Discounts" },
            { id: "offer", label: "Member Offers" },
            { id: "reward", label: "Rewards" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setMechanicFilter(m.id);
              }}
              className={cn(
                "rounded-xl px-2.5 py-1 text-xs transition cursor-pointer shrink-0 ring-1",
                mechanicFilter === m.id
                  ? "bg-ink text-paper ring-ink font-bold"
                  : "bg-paper text-mute ring-line hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="mt-12 flex flex-col items-center justify-center py-12 text-center text-mute space-y-2">
          <Loader2 size={24} className="animate-spin text-brand" />
          <p className="text-xs font-medium">Loading local deals & perks…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-card p-8 md:p-12 text-center ring-1 ring-line shadow-xs">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-brand mx-auto mb-3 ring-1 ring-brand/20">
            <BadgePercent size={32} />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">
            {search ? `No deals found matching "${search}"` : "No active deals in this category yet"}
          </h2>
          <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
            Be the first business to publish an offer or seed Sydney sample deals to explore.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/business/promotions/new">
              <Button size="sm" className="gap-1.5 rounded-full px-5">
                <Plus size={14} />
                <span>Post a Deal</span>
              </Button>
            </Link>

            <Button
              variant="outlined"
              size="sm"
              onClick={() => void handleSeedDemo()}
              disabled={seeding}
              className="gap-1.5 rounded-full px-4"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-gold" />}
              <span>Seed Sample Deals</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const expired = p.endAt && Date.parse(p.endAt) <= Date.now();
            const isOwner = user?.uid && p.ownerUid === user.uid;
            const coverImage = promoArtFor(p.category, p.heroImage);

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs hover:shadow-md transition duration-200"
              >
                {/* Top Image Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper">
                  <img
                    src={coverImage}
                    alt={p.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-black/20 to-transparent" />

                  {/* Badges Over Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                      <Tag size={11} className="text-amber-300" />
                      <span>{p.category}</span>
                    </span>

                    {p.prizeValue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-black text-white shadow-sm">
                        {p.prizeValue}
                      </span>
                    )}
                  </div>

                  {/* Bottom title in cover */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {p.sponsorName || "Local Partner"}
                    </p>
                    <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-1">
                      {p.title}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-mute line-clamp-2 leading-relaxed">
                    {p.description || "Claim exclusive perk on AirPal.Me."}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-mute border-t border-line/60 pt-3">
                    {p.locationText && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-brand shrink-0" />
                        <span className="truncate font-medium text-ink/90">{p.locationText}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {p.endAt && !expired ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                          <Clock size={12} />
                          <span>Ends {new Date(p.endAt).toLocaleDateString()}</span>
                        </span>
                      ) : expired ? (
                        <span className="text-red-500 font-semibold">Ended</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live Now</span>
                      )}

                      <span className="capitalize rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-mute ring-1 ring-line">
                        {p.mechanicType.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {(isOwner || isAdmin) ? (
                      <Link
                        href={isAdmin ? `/admin/promotions/${p.id}` : `/business/promotions/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </Link>
                    ) : (
                      <span className="text-[11px] font-semibold text-mute">AirPal Verified</span>
                    )}

                    <Link
                      href={`/promotions/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
                    >
                      <Ticket size={13} />
                      <span>Claim Deal</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
