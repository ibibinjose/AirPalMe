import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { collection, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { createSubmitGuard } from "@/lib/submit-guard";
import { canTransitionPing, isOpenPing, type AirPalPing, type PingStatus } from "@shared/ping";
import { cn } from "@/lib/cn";

function row(data: Record<string, unknown>, id: string): AirPalPing {
  return {
    id,
    fromUid: String(data.fromUid || ""),
    fromName: String(data.fromName || "AirPal Mate"),
    fromHandle: typeof data.fromHandle === "string" ? data.fromHandle : undefined,
    toUid: String(data.toUid || ""),
    toHandle: String(data.toHandle || ""),
    status: data.status as PingStatus,
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
    respondedAt: typeof data.respondedAt === "string" ? data.respondedAt : undefined,
  };
}

/**
 * Pings inbox: who pinged you (ping back → make a plan), who pinged back,
 * and pings you sent. Sorted client-side so no composite index is needed.
 */
export function PingsPanel() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const [received, setReceived] = useState<AirPalPing[]>([]);
  const [sent, setSent] = useState<AirPalPing[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const guardRef = useRef(createSubmitGuard());

  const reload = useCallback(async () => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user) return;
    try {
      const [rx, tx] = await Promise.all([
        getDocs(query(collection(db, "pings"), where("toUid", "==", user.uid), limit(20))),
        getDocs(query(collection(db, "pings"), where("fromUid", "==", user.uid), limit(20))),
      ]);
      const byUpdated = (a: AirPalPing, b: AirPalPing) => b.updatedAt.localeCompare(a.updatedAt);
      setReceived(rx.docs.map((d) => row(d.data(), d.id)).sort(byUpdated));
      setSent(tx.docs.map((d) => row(d.data(), d.id)).sort(byUpdated));
    } catch {
      /* offline — panels stay empty rather than stale */
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function transition(ping: AirPalPing, next: PingStatus) {
    const db = getFirebaseDb();
    if (!db || !user) return;
    const actor = ping.fromUid === user.uid ? "sender" : "recipient";
    if (!canTransitionPing(ping.status, next, actor)) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusyId(ping.id);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "pings", ping.id), { status: next, updatedAt: now, respondedAt: now });
      await reload();
    } catch (err) {
      guardRef.current.release();
      toast.error(err instanceof Error ? err.message : "Couldn't update the ping.");
    } finally {
      guardRef.current.release();
      setBusyId(null);
    }
  }

  function makePlan(ping: AirPalPing) {
    const otherHandle = ping.fromUid === user?.uid ? ping.toHandle : ping.fromHandle;
    if (ping.status === "sent" || ping.status === "pinged_back") {
      void transition(ping, "hanging_out").then(() => {
        nav(otherHandle ? `/plan/new?with=${otherHandle}` : "/plan/new");
      });
      return;
    }
    nav(otherHandle ? `/plan/new?with=${otherHandle}` : "/plan/new");
  }

  if (received.length === 0 && sent.length === 0) {
    return (
      <div className="mt-4 rounded-[20px] bg-card px-4 py-10 text-center ring-1 ring-line/80">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-accent">
          <Zap size={22} />
        </span>
        <p className="font-display mt-4 text-xl font-semibold">No pings yet</p>
        <p className="mx-auto mt-1 max-w-xs text-[15px] leading-6 text-mute">
          Ping someone on AirPal to see who&apos;s around — ping-backs land here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {received.filter((p) => isOpenPing(p.status)).length > 0 && (
        <section aria-label="Pinged you">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Pinged you</p>
          <ul className="mt-2 overflow-hidden rounded-[20px] bg-card ring-1 ring-line/80">
            {received
              .filter((p) => isOpenPing(p.status))
              .map((p, i) => (
                <li key={p.id} className={cn("px-4 py-3.5", i > 0 && "border-t border-line/70")}>
                  <p className="text-[15px] font-semibold text-ink">
                    {p.fromName}
                    {p.fromHandle && <span className="font-normal text-mute"> @{p.fromHandle}</span>}
                  </p>
                  <p className="text-[13px] text-mute">
                    {p.status === "pinged_back" ? "Pinged you back — wants to hang out." : "Wants to know if you're around."}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {p.status === "sent" && (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void transition(p, "pinged_back")}
                        className="h-9 rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-ink active:scale-95 disabled:opacity-50"
                      >
                        Ping back
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => makePlan(p)}
                      className="h-9 rounded-full bg-brand/10 px-4 text-[13px] font-semibold text-accent transition hover:bg-brand/15 active:scale-95 disabled:opacity-50"
                    >
                      Make a plan
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void transition(p, "dismissed")}
                      className="h-9 rounded-full px-3 text-[13px] font-semibold text-mute transition hover:text-ink disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {sent.filter((p) => isOpenPing(p.status)).length > 0 && (
        <section aria-label="Your pings">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Your pings</p>
          <ul className="mt-2 overflow-hidden rounded-[20px] bg-card ring-1 ring-line/80">
            {sent
              .filter((p) => isOpenPing(p.status))
              .map((p, i) => (
                <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-line/70")}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-accent">
                    <Zap size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">@{p.toHandle}</span>
                    <span className="block text-[13px] text-mute">
                      {p.status === "pinged_back" ? "Pinged you back — hang out?" : "Waiting for a ping back."}
                    </span>
                  </span>
                  {p.status === "pinged_back" ? (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => makePlan(p)}
                      className="h-9 shrink-0 rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-ink active:scale-95 disabled:opacity-50"
                    >
                      Hang out
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void transition(p, "cancelled")}
                      className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-mute transition hover:text-ink disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
