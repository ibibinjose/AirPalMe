import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, Gift, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { PromotionTerms } from "@/components/promotions/PromotionTerms";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enterPromotionRemote, friendlyPromotionError, promoArtFor } from "@/lib/promotions";
import type { Promotion } from "@shared/promotions";

export function PromotionDetailPage({ kind }: { kind: "giveaway" | "promotion" }) {
  const { id } = useParams<{ id: string }>();
  const { user, requireUser } = useAuth();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entering, setEntering] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    void getDoc(doc(db, "promotions", id))
      .then((snap) => {
        if (!snap.exists) {
          setNotFound(true);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Omit<Promotion, "id">) };
        if (data.kind !== kind || (data.status !== "live" && data.status !== "closed")) {
          setNotFound(true);
          return;
        }
        setPromo(data);
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
        if (!snap.empty) setReference(String(snap.docs[0].data().reference || ""));
      })
      .catch(() => undefined);
  }, [user, id, promo]);

  async function enter() {
    if (!requireUser("Sign in to enter this giveaway.")) return;
    if (!id) return;
    setEntering(true);
    try {
      const res = await enterPromotionRemote({ promotionId: id });
      setReference(res.reference);
      toast.success(res.duplicate ? "You're already in — entry confirmed." : "Entry confirmed. Good luck!");
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setEntering(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-mute">Loading…</p>;
  if (notFound || !promo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-display text-xl font-bold">This campaign isn't available.</p>
        <p className="mt-1 text-sm text-mute">It may have ended or been removed.</p>
        <Link href={kind === "giveaway" ? "/giveaways" : "/promotions"}>
          <Button className="mt-4">Back to {kind === "giveaway" ? "giveaways" : "promotions"}</Button>
        </Link>
      </div>
    );
  }

  const closed = promo.status === "closed" || (promo.endAt && Date.parse(promo.endAt) <= Date.now());
  const canEnter = promo.kind === "giveaway" && !closed && !reference;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={kind === "giveaway" ? "/giveaways" : "/promotions"} className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> {kind === "giveaway" ? "Giveaways" : "Promotions"}
      </Link>

      {promoArtFor(promo.category, promo.heroImage) ? (
        <img src={promoArtFor(promo.category, promo.heroImage)} alt={promo.title} className="mt-4 h-56 w-full rounded-3xl border-2 border-ink object-cover" />
      ) : (
        <div className="mt-4 grid h-40 w-full place-items-center rounded-3xl border-2 border-ink bg-gradient-to-br from-brand/15 via-sky-100 to-emerald-100">
          <Gift size={44} className="text-brand" />
        </div>
      )}

      <h1 className="font-display mt-4 text-3xl font-bold leading-tight">{promo.title}</h1>
      <p className="mt-1 text-sm text-mute">by {promo.sponsorName}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { icon: Gift, label: "Prize", value: promo.prizeValue || promo.prize.title },
          { icon: CalendarDays, label: "Closes", value: promo.endAt ? new Date(promo.endAt).toLocaleDateString() : "—" },
          { icon: MapPin, label: "Where", value: promo.locationText || "Kerala" },
          { icon: User, label: "Eligibility", value: promo.eligibility.split(".")[0] },
        ].map((f) => (
          <div key={f.label} className="rounded-2xl border-2 border-ink bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-mute">
              <f.icon size={12} /> {f.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold">{f.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{promo.description}</p>

      {promo.prize.included && promo.prize.included.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-ink bg-card p-4">
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

      {promo.targetId && (
        <Link href={`/p/${promo.targetId}`}>
          <Button className="mt-4 w-full">View the experience</Button>
        </Link>
      )}

      <div className="mt-4">
        {reference ? (
          <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <p className="font-display mt-1 text-lg font-bold">Entry confirmed</p>
            <p className="mt-0.5 text-sm text-mute">
              Reference <span className="font-mono font-bold text-ink">{reference}</span>
            </p>
            <p className="mt-1 text-xs text-mute">Entry never guarantees winning. Winners are announced {promo.winnerAnnouncementAt ? new Date(promo.winnerAnnouncementAt).toLocaleDateString() : "after closing"}.</p>
          </div>
        ) : canEnter ? (
          <Button onClick={enter} disabled={entering} className="w-full py-3 text-base">
            {entering ? "Confirming…" : "Enter now — it's free"}
          </Button>
        ) : closed ? (
          <div className="rounded-2xl border-2 border-ink/20 bg-card p-4 text-center text-sm font-semibold text-mute">
            This {kind} has closed.
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <PromotionTerms promotion={promo} />
      </div>
    </div>
  );
}
