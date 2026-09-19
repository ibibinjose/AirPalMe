import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { PartyPopper, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { markPopupShown, shownPopupIds } from "@/lib/notifications";
import { isPriorityKind } from "@shared/notifications";
import type { PromotionNotification } from "@shared/promotions";

/**
 * One-time popup for priority inbox items (wins, prizes, verification).
 * Shows above everything, once per notification, with a clear path to act.
 */
export function NotificationPopup() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<PromotionNotification[]>([]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) return;
    void getDocs(
      query(collection(db, "promotion_notifications"), where("uid", "==", user.uid), orderBy("at", "desc"), limit(15)),
    )
      .then((snap) => {
        const shown = shownPopupIds();
        setQueue(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) }))
            .filter((n) => !n.read && !shown.has(n.id) && isPriorityKind(n.kind)),
        );
      })
      .catch(() => undefined);
  }, [user]);

  const current = queue[0];
  if (!current) return null;

  function dismiss() {
    markPopupShown(current.id);
    setQueue((q) => q.slice(1));
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
    >
      <div className="relative w-full max-w-sm rounded-[28px] ring-1 ring-line bg-card p-6 text-center shadow-2xl">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold">
          <PartyPopper size={26} />
        </span>
        <h2 className="font-display mt-3 text-2xl font-bold leading-tight">{current.title}</h2>
        <p className="mt-1 text-sm text-mute">{current.body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-2xl ring-1 ring-line/15 bg-card px-4 py-2.5 text-sm font-bold"
          >
            Later
          </button>
          <Link
            href={current.href || "/me/giveaways"}
            onClick={dismiss}
            className="flex-1 rounded-2xl bg-brand px-4 py-2.5 text-center text-sm font-bold text-white"
          >
            View now
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-4 top-4 text-mute hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
