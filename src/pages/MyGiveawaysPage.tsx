import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { ArrowLeft, Bell, Gift, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import type { PromotionEntry, PromotionNotification, RewardState, RewardTransaction } from "@shared/promotions";

export function MyGiveawaysPage() {
  const { user, authReady, requireUser } = useAuth();
  const [entries, setEntries] = useState<PromotionEntry[]>([]);
  const [rewards, setRewards] = useState<RewardState | null>(null);
  const [txs, setTxs] = useState<RewardTransaction[]>([]);
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [optOut, setOptOut] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!requireUser("Sign in to see your giveaways.")) {
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    if (!db || !user) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const [eSnap, rSnap, tSnap, nSnap, uSnap] = await Promise.all([
          getDocs(query(collection(db, "promotion_entries"), where("uid", "==", user.uid))),
          getDoc(doc(db, "rewards", user.uid)),
          getDocs(query(collection(db, "reward_transactions"), where("uid", "==", user.uid), orderBy("at", "desc"))),
          getDocs(
            query(collection(db, "promotion_notifications"), where("uid", "==", user.uid), orderBy("at", "desc")),
          ),
          getDoc(doc(db, "users", user.uid)),
        ]);
        const e = eSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionEntry, "id">) }));
        e.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setEntries(e);
        if (rSnap.exists()) setRewards({ uid: user.uid, ...(rSnap.data() as Omit<RewardState, "uid">) });
        setTxs(tSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RewardTransaction, "id">) })));
        setNotes(nSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) })));
        if (uSnap.exists()) setOptOut(Boolean(uSnap.data()?.marketingOptOut));
      } catch {
        /* offline or unconfigured backend: sections stay empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, user, requireUser]);

  async function markRead(n: PromotionNotification) {
    const db = getFirebaseDb();
    if (!db || n.read) return;
    try {
      await updateDoc(doc(db, "promotion_notifications", n.id), { read: true });
      setNotes((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      toast.error("Couldn't mark as read.");
    }
  }

  async function toggleOptOut() {
    const db = getFirebaseDb();
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { marketingOptOut: !optOut });
      setOptOut(!optOut);
      toast.success(!optOut ? "Marketing notifications off." : "Marketing notifications on.");
    } catch {
      toast.error("Couldn't save preference yet.");
    }
  }

  const unread = notes.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/me" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> You
      </Link>
      <h1 className="font-display mt-4 text-2xl font-bold">My giveaways</h1>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl ring-1 ring-line bg-card p-4 text-center">
              <Star size={18} className="mx-auto text-gold" />
              <p className="font-display mt-1 text-2xl font-bold">{rewards?.points || 0}</p>
              <p className="text-[11px] text-mute">AirPal.Me points</p>
            </div>
            <div className="rounded-2xl ring-1 ring-line bg-card p-4 text-center">
              <Gift size={18} className="mx-auto text-brand" />
              <p className="font-display mt-1 text-2xl font-bold">{entries.length}</p>
              <p className="text-[11px] text-mute">Entries</p>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute">
              <Bell size={13} /> Inbox{" "}
              {unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{unread}</span>}
            </h2>
            {notes.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-ink/20 p-4 text-center text-xs text-mute">
                No notifications yet. Enter a giveaway and results land here.
              </p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 20).map((n) => {
                  const cls = cn(
                    "block w-full rounded-2xl border-2 bg-card p-3 text-left",
                    n.read ? "border-ink/15" : "border-ink",
                  );
                  const body = (
                    <>
                      <p className="text-sm font-bold">{n.title}</p>
                      <p className="mt-0.5 text-xs text-mute">{n.body}</p>
                    </>
                  );
                  return n.href ? (
                    <Link key={n.id} href={n.href} onClick={() => markRead(n)} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <button key={n.id} type="button" onClick={() => markRead(n)} className={cls}>
                      {body}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={toggleOptOut}
              className="mt-3 text-xs font-semibold text-brand hover:underline"
            >
              {optOut ? "Turn marketing notifications on" : "Turn marketing notifications off"}
            </button>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">My entries</h2>
            {entries.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-ink/20 p-4 text-center text-xs text-mute">
                No entries yet.
                <Link href="/giveaways">
                  <Button className="mt-2">Browse giveaways</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-2xl ring-1 ring-line/15 bg-card p-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold">{e.reference}</p>
                      <p className="text-[11px] text-mute">
                        {new Date(e.createdAt).toLocaleDateString()} · {e.status}
                      </p>
                    </div>
                    <Link href={`/giveaways/${e.promotionId}`} className="text-xs font-bold text-brand hover:underline">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {txs.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Points history</h2>
              <div className="space-y-1 rounded-2xl ring-1 ring-line/15 bg-card p-3">
                {txs.slice(0, 15).map((t) => (
                  <p key={t.id} className="flex justify-between text-[11px]">
                    <span className="text-mute">{t.reason.replace(/_/g, " ")}</span>
                    <span className={cn("font-bold", t.delta >= 0 ? "text-emerald-700" : "text-ink")}>
                      {t.delta >= 0 ? `+${t.delta}` : t.delta}
                    </span>
                  </p>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
