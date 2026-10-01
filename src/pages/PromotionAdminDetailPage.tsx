import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { liveBackendEnabled } from "@/lib/functions";
import {
  closeAndDrawRemote,
  friendlyPromotionError,
  reviewPromotionRemote,
  setWinnerStatusRemote,
} from "@/lib/promotions";
import { cn } from "@/lib/cn";
import {
  WINNER_TRANSITIONS,
  type Promotion,
  type PromotionAuditLog,
  type PromotionEntry,
  type PromotionWinner,
  type ReviewPromotionRequest,
  type WinnerStatus,
} from "@shared/promotions";

export function PromotionAdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, authReady } = useAuth();
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [entries, setEntries] = useState<PromotionEntry[]>([]);
  const [winners, setWinners] = useState<PromotionWinner[]>([]);
  const [audit, setAudit] = useState<PromotionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [winnerCount, setWinnerCount] = useState(1);

  async function reload() {
    const db = getFirebaseDb();
    if (!db || !id) return;
    try {
      const snap = await getDoc(doc(db, "promotions", id));
      if (snap.exists()) setPromo({ id: snap.id, ...(snap.data() as Omit<Promotion, "id">) });
      const [eSnap, wSnap, aSnap] = await Promise.all([
        getDocs(query(collection(db, "promotion_entries"), where("promotionId", "==", id))),
        getDocs(query(collection(db, "promotion_winners"), where("promotionId", "==", id))),
        getDocs(query(collection(db, "promotion_audit_logs"), where("promotionId", "==", id))),
      ]);
      setEntries(eSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionEntry, "id">) })));
      const w = wSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionWinner, "id">) }));
      w.sort((a, b) => a.drawIndex - b.drawIndex);
      setWinners(w);
      const a = aSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionAuditLog, "id">) }));
      a.sort((x, y) => (y.at || "").localeCompare(x.at || ""));
      setAudit(a);
    } catch {
      /* readable errors surface via empty state */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (locked) return;
    void reload();
  }, [locked, id]);

  if (!authReady || loading)
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-mute">Loading…</p>;
  if (locked || !promo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl font-bold">Restricted</p>
        <Link href="/admin/promotions">
          <Button className="mt-4">Back</Button>
        </Link>
      </div>
    );
  }

  const act = async (decision: ReviewPromotionRequest["decision"]) => {
    if (!id) return;
    setBusy(decision);
    try {
      await reviewPromotionRemote({ promotionId: id, decision });
      toast.success(`Campaign ${decision.replace("_", " ")}.`);
      await reload();
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(null);
    }
  };

  const draw = async () => {
    if (!id) return;
    if (!window.confirm(`Close ${promo.title} and draw ${winnerCount} winner(s)? Entries freeze now.`)) return;
    setBusy("draw");
    try {
      const res = await closeAndDrawRemote({ promotionId: id, winnerCount });
      toast.success(`Drew ${res.winners} winner(s) from ${res.entries} entries.`);
      await reload();
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(null);
    }
  };

  const advanceWinner = async (w: PromotionWinner, to: WinnerStatus) => {
    setBusy(w.id + to);
    try {
      await setWinnerStatusRemote({ winnerId: w.id, to });
      toast.success(`Winner ${to.replace("_", " ")}.`);
      await reload();
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <Link
        href="/admin/promotions"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
      >
        <ArrowLeft size={14} /> Promotions
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <h1 className="font-display flex-1 text-2xl font-bold">{promo.title}</h1>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-mute">
          {promo.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-1 text-xs text-mute">
        {promo.kind} · {promo.mechanicType} · legal {promo.legalReviewStatus.replace("_", " ")} · {promo.sponsorName}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          [promo.viewsCount || 0, "Views"],
          [promo.clicksCount || 0, "Clicks"],
          [promo.entriesCount || entries.length, "Entries"],
          [winners.length, "Winners"],
        ].map(([n, label]) => (
          <div key={String(label)} className="rounded-2xl ring-1 ring-line bg-card p-3">
            <p className="font-display text-xl font-bold">{n}</p>
            <p className="text-[11px] text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["approve", "publish", "pause", "resume", "close", "archive"] as const).map((d) => (
          <button
            key={d}
            type="button"
            disabled={busy === d}
            onClick={() => act(d)}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-line px-3.5 text-xs font-bold transition hover:bg-brand hover:text-white active:scale-95 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
      </div>

      {promo.kind === "giveaway" && (promo.status === "live" || promo.status === "paused") && (
        <div className="mt-4 rounded-2xl border-2 border-gold bg-card p-4">
          <p className="text-sm font-bold">Close & draw winners</p>
          <p className="mt-0.5 text-xs text-mute">
            Entries freeze at draw time. The draw, pool size and reason go to the audit log; winners are notified.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={1}
              max={10}
              value={winnerCount}
              onChange={(e) => setWinnerCount(Number(e.target.value))}
              className="h-11 w-20 rounded-xl ring-1 ring-line px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
              aria-label="Number of winners"
            />
            <Button onClick={draw} disabled={busy === "draw"} className="flex-1">
              {busy === "draw" ? "Drawing…" : `Draw ${winnerCount} winner(s)`}
            </Button>
          </div>
        </div>
      )}

      {winners.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Winners (private)</h2>
          <div className="space-y-2">
            {winners.map((w) => (
              <div key={w.id} className="rounded-2xl ring-1 ring-line bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{w.reference}</span>
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold">
                    {w.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(WINNER_TRANSITIONS[w.status] || []).map((to) => (
                    <button
                      key={to}
                      type="button"
                      disabled={busy === w.id + to}
                      onClick={() => advanceWinner(w, to)}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-line px-3.5 text-xs font-bold transition hover:bg-brand hover:text-white active:scale-95 disabled:opacity-50"
                    >
                      → {to.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Entries ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-ink/20 p-4 text-center text-xs text-mute">
            No entries yet.
          </p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl ring-1 ring-line/15 bg-card p-2">
            {entries.map((e) => (
              <p key={e.id} className="flex justify-between font-mono text-[11px]">
                <span>{e.reference}</span>
                <span className="text-mute">{new Date(e.createdAt).toLocaleDateString()}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Audit trail</h2>
        <div
          className={cn(
            "space-y-1 rounded-2xl ring-1 ring-line/15 bg-card p-3",
            audit.length === 0 && "text-center text-xs text-mute",
          )}
        >
          {audit.length === 0
            ? "No admin actions recorded."
            : audit.map((a) => (
                <p key={a.id} className="text-[11px]">
                  <span className="font-bold">{a.action}</span> {a.from ? `${a.from} → ${a.to}` : ""}{" "}
                  <span className="text-mute">
                    {a.at ? new Date(a.at).toLocaleString() : ""}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </span>
                </p>
              ))}
        </div>
      </section>
    </div>
  );
}
