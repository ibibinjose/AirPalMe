import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { friendlyPromotionError, submitPromotionRemote, updatePromotionRemote } from "@/lib/promotions";
import { createBroadcastRemote } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import type { Promotion } from "@shared/promotions";

const EDITABLE = ["draft", "submitted", "rejected"];

export function BusinessPromotionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    prizeValue: "",
    eligibility: "",
    termsText: "",
    locationText: "",
  });
  const [announce, setAnnounce] = useState({ title: "", body: "", open: false });

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !id || !user) {
      setLoading(false);
      return;
    }
    void getDoc(doc(db, "promotions", id))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = { id: snap.id, ...(snap.data() as Omit<Promotion, "id">) };
        if (data.ownerUid !== user.uid) return;
        setPromo(data);
        setDraft({
          title: data.title,
          description: data.description,
          prizeValue: data.prizeValue || "",
          eligibility: data.eligibility,
          termsText: data.termsText,
          locationText: data.locationText || "",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !id || !promo) return;
    void getDocs(query(collection(db, "promotion_redemptions"), where("promotionId", "==", id)))
      .then((snap) => setRedemptions(snap.size))
      .catch(() => undefined);
  }, [id, promo]);

  if (loading) return <p className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-mute">Loading…</p>;
  if (!promo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-display text-xl font-bold">Campaign not found.</p>
        <Link href="/business/promotions">
          <Button className="mt-4">Back</Button>
        </Link>
      </div>
    );
  }

  const canEdit = EDITABLE.includes(promo.status);

  async function save() {
    if (!id) return;
    setBusy(true);
    try {
      await updatePromotionRemote({ promotionId: id, patch: draft });
      toast.success("Saved.");
      setPromo((p) => (p ? { ...p, ...draft } : p));
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!id) return;
    setBusy(true);
    try {
      await submitPromotionRemote({ promotionId: id });
      toast.success("Submitted for AirPal.Me review.");
      setPromo((p) => (p ? { ...p, status: "submitted" } : p));
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/business/promotions" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Your promotions
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <h1 className="font-display flex-1 text-2xl font-bold">{promo.title}</h1>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mute">
          {promo.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          [promo.viewsCount || 0, "Views"],
          [promo.clicksCount || 0, "Clicks"],
          [promo.entriesCount || 0, "Entries"],
          [redemptions, "Redeemed"],
        ].map(([n, label]) => (
          <div key={String(label)} className="rounded-2xl ring-1 ring-line bg-card p-3">
            <p className="font-display text-xl font-bold">{n}</p>
            <p className="text-[11px] text-mute">{label}</p>
          </div>
        ))}
      </div>

      {promo.winnerNote && (
        <p className="mt-3 rounded-2xl border-2 border-gold bg-card p-3 text-sm font-semibold">🏆 {promo.winnerNote}</p>
      )}

      {(promo.status === "live" || promo.status === "paused") && (
        <div className="mt-4 rounded-2xl ring-1 ring-line bg-card p-4">
          {!announce.open ? (
            <button
              type="button"
              onClick={() => setAnnounce((a) => ({ ...a, open: true }))}
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white"
            >
              Message entrants
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold">Message entrants</p>
              <p className="text-xs text-mute">Goes to everyone who entered. AirPal.Me approves before it sends.</p>
              <input
                value={announce.title}
                onChange={(e) => setAnnounce((a) => ({ ...a, title: e.target.value }))}
                placeholder="Title (80 chars)"
                maxLength={80}
                className="w-full rounded-xl ring-1 ring-line/15 p-2 text-sm"
              />
              <textarea
                value={announce.body}
                onChange={(e) => setAnnounce((a) => ({ ...a, body: e.target.value }))}
                placeholder="Your update (280 chars)"
                maxLength={280}
                rows={3}
                className="w-full rounded-xl ring-1 ring-line/15 p-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAnnounce({ title: "", body: "", open: false })}
                  className="flex-1 rounded-xl ring-1 ring-line/15 px-4 py-2 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !announce.title.trim() || !announce.body.trim()}
                  onClick={async () => {
                    if (!id) return;
                    setBusy(true);
                    try {
                      await createBroadcastRemote({
                        title: announce.title.trim(),
                        body: announce.body.trim(),
                        audience: "promotion_entrants",
                        promotionId: id,
                      });
                      toast.success("Sent for AirPal.Me approval.");
                      setAnnounce({ title: "", body: "", open: false });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Couldn't send.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="flex-1 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Submit for approval
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canEdit ? (
        <div className="mt-4 space-y-2 rounded-3xl ring-1 ring-line bg-card p-4">
          {[
            ["title", "Title"],
            ["prizeValue", "Offer / prize value"],
            ["locationText", "Location"],
            ["eligibility", "Eligibility"],
          ].map(([k, label]) => (
            <label key={k} className="block text-xs font-semibold">
              {label}
              <input
                value={draft[k as keyof typeof draft]}
                onChange={(e) => set(k, e.target.value)}
                className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
              />
            </label>
          ))}
          <label className="block text-xs font-semibold">
            Description
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold">
            Terms & redemption rules
            <textarea
              value={draft.termsText}
              onChange={(e) => set("termsText", e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="flex-1 bg-card text-ink ring-1 ring-line">
              Save
            </Button>
            {(promo.status === "draft" || promo.status === "rejected") && (
              <Button onClick={submit} disabled={busy} className="flex-1">
                Submit for review
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={cn("mt-4 rounded-2xl ring-1 ring-line/15 bg-card p-4 text-sm text-mute")}>
          {promo.status === "submitted" || promo.status === "under_review"
            ? "With the AirPal.Me team for review. You'll be notified of the decision."
            : "This campaign is locked while live. Contact support to request changes."}
        </div>
      )}
    </div>
  );
}
