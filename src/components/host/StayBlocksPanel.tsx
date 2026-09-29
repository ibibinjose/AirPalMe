import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { isStayDay, stayBlockId } from "@shared/stay-booking";

/**
 * D3 — host-blocked nights. Blocked dates refuse quotes and checkouts
 * server-side; this panel only edits the ledger the rules gate to managers.
 */
export function StayBlocksPanel({ propertyId }: { propertyId: string }) {
  const [dates, setDates] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !propertyId) return;
    try {
      const snap = await getDocs(query(collection(db, "stay_blocks"), where("propertyId", "==", propertyId)));
      const list = snap.docs
        .map((d) => String((d.data() as { date?: unknown }).date || ""))
        .filter(isStayDay)
        .sort();
      setDates(list);
    } catch {
      /* panel stays usable; save surfaces errors */
    }
  }

  useEffect(() => {
    setDates([]);
    void reload();
  }, [propertyId]);

  async function block() {
    const db = getFirebaseDb();
    if (!db || !isStayDay(day)) {
      toast.error("Pick a valid date to block.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, "stay_blocks", stayBlockId(propertyId, day)), {
        propertyId,
        date: day,
        reason: "",
        createdAt: now,
        updatedAt: now,
      });
      setDay("");
      await reload();
      toast.success(`${day} blocked — quotes refuse it.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't block that night.");
    } finally {
      setBusy(false);
    }
  }

  async function unblock(date: string) {
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "stay_blocks", stayBlockId(propertyId, date)));
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't unblock that night.");
    } finally {
      setBusy(false);
    }
  }

  if (!propertyId || propertyId === "unknown") return null;

  return (
    <section className="mt-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm" aria-label="Blocked nights">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
        <CalendarOff size={14} className="text-gold" /> Blocked nights
      </p>
      <p className="mt-1 text-[13px] text-mute">
        Maintenance, full house, host stay — blocked nights cannot be quoted or booked.
      </p>
      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1">
          <span className="text-[12px] text-mute">Block a night</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <Button className="h-11 px-4 text-xs" disabled={busy || !isStayDay(day)} loading={busy} onClick={() => void block()}>
          Block
        </Button>
      </div>
      {dates.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {dates.map((d) => (
            <li key={d}>
              <button
                type="button"
                title={`Unblock ${d}`}
                disabled={busy}
                onClick={() => void unblock(d)}
                className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-xs font-medium ring-1 ring-line transition hover:ring-red-400 active:scale-95"
              >
                {d} ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
