import { useEffect, useState } from "react";
import { Link } from "wouter";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, CalendarDays, MapPin, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { trackContentAction } from "@/lib/analytics";
import { aud, type Campaign } from "@shared/campaign";

export function ExperiencesPage() {
  const { user, requireUser } = useAuth();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    void getDocs(query(collection(db, "campaigns"), where("status", "==", "live")))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, "id">) }));
        list.sort((a, b) => a.date.localeCompare(b.date));
        setRows(list);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function join(c: Campaign) {
    if (!requireUser("Sign in to join this experience.")) return;
    if (!user) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) return;
    setBusy(c.id);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "campaign_rsvps"), {
        campaignId: c.id,
        attendeeUid: user.uid,
        seats: 1,
        createdAt: now,
        updatedAt: now,
      });
      trackContentAction("booking_intent", c.id, { source: "experiences" });
      setJoined((j) => ({ ...j, [c.id]: true }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Explore
      </Link>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Experiences</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Find something worth doing</h1>
      <p className="mt-1 text-sm text-mute">Hosted with Sydney venues. Going alone? Find an AirPal Mate.</p>

      {loading ? (
        <p className="mt-6 text-sm text-mute">Loading experiences…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center">
          <p className="font-display text-lg font-bold">No live experiences this week</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
            Businesses launch new ones regularly. Meanwhile, request a Mate for anything else.
          </p>
          <Link href="/mate/request">
            <Button variant="dark" className="mt-4">
              Find someone to go with
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">{c.category}</p>
              <h2 className="font-display mt-0.5 text-lg font-bold tracking-tight">{c.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-mute">{c.brief}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {c.businessName} · {c.suburb}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={13} /> {c.date}
                  {c.time ? ` · ${c.time}` : ""}
                </span>
                <span className="flex items-center gap-1 font-semibold text-ink">
                  <Ticket size={13} /> {aud(c.priceCents)}
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={joined[c.id] || busy === c.id} loading={busy === c.id} onClick={() => void join(c)}>
                  {joined[c.id] ? "You're in ✓" : c.priceCents > 0 ? "Book (pay later)" : "Join free"}
                </Button>
                <Link href="/mate/request">
                  <Button size="sm" variant="ghost">
                    Going alone? Find a Mate
                  </Button>
                </Link>
              </div>
              {c.priceCents > 0 && (
                <p className="mt-1.5 text-[11px] text-mute">Paid at the door for now — in-app payment lands with Stripe.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
