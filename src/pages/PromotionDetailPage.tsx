import { useEffect, useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, Gift, MapPin, Share2, Trophy, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AirPalMascot } from "@/components/brand/AirPalMascot";
import { ConfettiBurst } from "@/components/brand/ConfettiBurst";
import { PromotionTerms } from "@/components/promotions/PromotionTerms";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import {
  enterPromotionRemote,
  friendlyPromotionError,
  promoArtFor,
  recordPromotionClickRemote,
  recordPromotionViewRemote,
  redeemPointsRemote,
} from "@/lib/promotions";
import { targetHref, type Promotion } from "@shared/promotions";
import { toPublicUrl } from "@/lib/public-origin";
import { clearPendingIntent, peekPendingIntent } from "@/lib/pending-intent";

export function PromotionDetailPage({ kind }: { kind: "giveaway" | "promotion" }) {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const { user, requireUser } = useAuth();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [related, setRelated] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entering, setEntering] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [code, setCode] = useState("");
  const [redeemCode, setRedeemCode] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [founderNumber, setFounderNumber] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  const refParam = new URLSearchParams(search).get("ref") || "";

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    void getDoc(doc(db, "promotions", id))
      .then((snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Omit<Promotion, "id">) };
        if (data.kind !== kind || (data.status !== "live" && data.status !== "closed")) {
          setNotFound(true);
          return;
        }
        setPromo(data);
        void recordPromotionViewRemote(data.id).catch(() => undefined);
        void getDocs(
          query(
            collection(db, "promotions"),
            where("kind", "==", data.kind),
            where("status", "==", "live"),
            where("category", "==", data.category),
            limit(4),
          ),
        )
          .then((rSnap) => {
            setRelated(
              rSnap.docs
                .map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }))
                .filter((r) => r.id !== data.id)
                .slice(0, 3),
            );
          })
          .catch(() => undefined);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, kind]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user || !id || !promo || promo.kind !== "giveaway") return;
    void getDocs(
      query(collection(db, "promotion_entries"), where("promotionId", "==", id), where("uid", "==", user.uid)),
    )
      .then((snap) => {
        if (snap.empty) return;
        const data = snap.docs[0].data() as { reference?: string; founderNumber?: number };
        setReference(String(data.reference || ""));
        if (typeof data.founderNumber === "number") setFounderNumber(data.founderNumber);
      })
      .catch(() => undefined);
  }, [user, id, promo]);

  async function doEnter() {
    if (!id) return;
    setEntering(true);
    try {
      const res = await enterPromotionRemote({ promotionId: id, code: code || undefined, ref: refParam || undefined });
      setReference(res.reference);
      if (typeof res.founderNumber === "number") setFounderNumber(res.founderNumber);
      if (!res.duplicate) setCelebrate((n) => n + 1);
      toast.success(
        typeof res.founderNumber === "number" && !res.duplicate
          ? `You're founder #${res.founderNumber.toLocaleString("en-AU")}. Good luck!`
          : res.duplicate
            ? "You're already in — entry confirmed."
            : "Entry confirmed. Good luck!",
      );
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setEntering(false);
    }
  }

  async function enter() {
    if (
      !requireUser("Sign in to enter this giveaway — your spot is saved when you return.", id ? { kind: "enter-promotion", id } : undefined)
    )
      return;
    await doEnter();
  }

  async function doRedeem() {
    if (!id) return;
    setRedeeming(true);
    try {
      const res = await redeemPointsRemote({ promotionId: id });
      setRedeemCode(res.code);
      toast.success("Offer redeemed.");
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setRedeeming(false);
    }
  }

  async function redeem() {
    if (
      !requireUser("Sign in to redeem this offer — it's saved for you when you return.", id ? { kind: "redeem-promotion", id } : undefined)
    )
      return;
    await doRedeem();
  }

  // Resume a guest's saved entry after they finish signing in.
  useEffect(() => {
    if (!user || !promo || !id) return;
    const intent = peekPendingIntent();
    if (!intent || intent.id !== id) return;
    if (intent.kind === "enter-promotion" && promo.kind === "giveaway" && !reference) {
      clearPendingIntent();
      void doEnter();
    } else if (intent.kind === "redeem-promotion" && promo.kind === "promotion" && !redeemCode) {
      clearPendingIntent();
      void doRedeem();
    }
  }, [user, promo, id]);

  async function share() {
    const url = toPublicUrl(`${window.location.pathname}${user ? `?ref=${user.uid}` : ""}`);
    try {
      if (navigator.share) {
        await navigator.share({ title: promo?.title || "AirPal.Me", text: "Discover. Experience. Win.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(user ? "Referral link copied — mates earn you points." : "Link copied.");
    } catch {
      /* dismissed */
    }
  }

  if (loading) return <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-mute">Loading…</p>;
  if (notFound || !promo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-display text-xl font-bold">This campaign isn't available.</p>
        <p className="mt-1 text-sm text-mute">It may have ended or been removed.</p>
        <Link href="/deals">
          <Button className="mt-4">Back to deals</Button>
        </Link>
      </div>
    );
  }

  const closed = promo.status === "closed" || (promo.endAt && Date.parse(promo.endAt) <= Date.now());
  const canEnter = promo.kind === "giveaway" && !closed && !reference;
  const target = targetHref(promo.targetType, promo.targetId);
  const art = promoArtFor(promo.category, promo.heroImage);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/deals"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
        >
          <ArrowLeft size={14} /> Deals
        </Link>
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-accent ring-1 ring-line hover:bg-paper"
        >
          <Share2 size={14} /> Share
        </button>
      </div>

      {art ? (
        <img src={art} alt={promo.title} className="mt-4 h-56 w-full rounded-3xl ring-1 ring-line object-cover" />
      ) : (
        <div className="mt-4 grid h-40 w-full place-items-center rounded-3xl ring-1 ring-line bg-paper">
          <Gift size={44} className="text-accent" />
        </div>
      )}

      <h1 className="font-display mt-4 text-3xl font-bold leading-tight">{promo.title}</h1>
      <p className="mt-1 text-sm text-mute">by {promo.sponsorName}</p>

      {promo.winnerNote && (
        <p className="mt-3 flex items-center gap-1.5 rounded-2xl border-2 border-gold bg-card p-3 text-sm font-semibold">
          <Trophy size={16} className="text-accent" /> {promo.winnerNote}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { icon: Gift, label: "Prize", value: promo.prizeValue || promo.prize.title },
          {
            icon: CalendarDays,
            label: "Closes",
            value: promo.endAt ? new Date(promo.endAt).toLocaleDateString() : "—",
          },
          { icon: MapPin, label: "Where", value: promo.locationText || "Sydney" },
          { icon: User, label: "Eligibility", value: promo.eligibility.split(".")[0] },
        ].map((f) => (
          <div key={f.label} className="rounded-2xl ring-1 ring-line bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-mute">
              <f.icon size={12} /> {f.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold">{f.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{promo.description}</p>

      {promo.prize.included && promo.prize.included.length > 0 && (
        <div className="mt-4 rounded-2xl ring-1 ring-line bg-card p-4">
          <p className="text-sm font-bold">What's included</p>
          <ul className="mt-2 space-y-1.5">
            {promo.prize.included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {target && !closed && (
        <a href={target} onClick={() => promo.id && recordPromotionClickRemote(promo.id).catch(() => undefined)}>
          <Button className="mt-4 w-full">View the experience</Button>
        </a>
      )}

      {promo.mechanicType === "member" && Number(promo.pointsCost) > 0 && !closed && (
        <div className="mt-4 rounded-2xl ring-1 ring-line bg-card p-4 text-center">
          {redeemCode ? (
            <>
              <p className="font-display text-lg font-bold">Redeemed</p>
              <p className="mt-0.5 text-sm text-mute">
                Show <span className="font-mono font-bold text-ink">{redeemCode}</span> in-store.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">Member offer · {promo.pointsCost} points</p>
              <Button onClick={redeem} disabled={redeeming} className="mt-2 w-full">
                {redeeming ? "Redeeming…" : `Redeem for ${promo.pointsCost} points`}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-4">
        {reference ? (
          <div className="rounded-2xl border-2 border-emerald-600/50 bg-emerald-500/10 p-4 text-center">
            <ConfettiBurst fireKey={celebrate} />
            <AirPalMascot className="mx-auto h-28 w-auto" />
            <CheckCircle2 size={28} className="mx-auto mt-2 text-emerald-600" />
            <p className="font-display mt-1 text-lg font-bold">Entry confirmed</p>
            {founderNumber !== null && (
              <p className="font-display mt-1 text-3xl font-black text-ink">
                #{founderNumber.toLocaleString("en-AU")}
              </p>
            )}
            <p className="mt-0.5 text-sm text-mute">
              Reference <span className="font-mono font-bold text-ink">{reference}</span>
            </p>
            <p className="mt-1 text-xs text-mute">
              Entry never guarantees winning. Winners are announced{" "}
              {promo.winnerAnnouncementAt ? new Date(promo.winnerAnnouncementAt).toLocaleDateString() : "after closing"}
              .
            </p>
          </div>
        ) : canEnter ? (
          <div className="space-y-2">
            {promo.promoCode && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Promotional code"
                className="min-h-[48px] w-full rounded-2xl ring-1 ring-line bg-card px-4 py-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-mute focus:ring-2 focus:ring-brand"
                aria-label="Promotional code"
              />
            )}
            <Button onClick={enter} disabled={entering} className="w-full py-3 text-base">
              {entering ? "Confirming…" : "Enter now — it's free"}
            </Button>
          </div>
        ) : closed ? (
          <div className="rounded-2xl ring-1 ring-line/20 bg-card p-4 text-center text-sm font-semibold text-mute">
            This {kind} has closed.
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <PromotionTerms promotion={promo} />
      </div>

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">
            More {promo.category.toLowerCase()} to discover
          </h2>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/${r.kind === "giveaway" ? "giveaways" : "promotions"}/${r.id}`}
                className="flex items-center gap-3 rounded-2xl ring-1 ring-line bg-card p-3 transition hover:bg-paper active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.title}</span>
                  <span className="block truncate text-xs text-mute">{r.prizeValue || r.sponsorName}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
