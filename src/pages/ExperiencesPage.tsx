import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { getFirebaseDb } from "@/lib/firebase";
import { trackContentAction } from "@/lib/analytics";
import { createBookingForCampaign } from "@/components/booking/BookingsSection";
import { createBookingCheckoutSessionRemote } from "@/lib/functions";
import { TicketPass } from "@/components/plan/TicketPass";
import { PaymentCanceledNotice } from "@/components/booking/PaymentCanceledNotice";
import { EventTile } from "@/components/event/EventTile";
import { aud, type Campaign } from "@shared/campaign";
import { cn } from "@/lib/cn";

export function ExperiencesPage() {
  const { user, requireUser } = useAuth();
  const { publicPlans } = usePlans();
  const { here, city, usingGps } = useLocalNow();
  const [, nav] = useLocation();
  const bookedId = new URLSearchParams(useSearch()).get("booked") || "";
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const livePlans = useMemo(
    () =>
      publicPlans.filter(
        (p) =>
          p.isExperience &&
          p.status === "open" &&
          locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M),
      ),
    [publicPlans, here, city, usingGps],
  );

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
    setBusy(c.id);
    try {
      const bookingId = await createBookingForCampaign({
        campaignId: c.id,
        providerUid: c.ownerUid,
        providerName: c.businessName,
        title: c.title,
        suburb: c.suburb,
        date: c.date,
        time: c.time || "",
        priceCents: c.priceCents,
        customerUid: user.uid,
        listingId: c.venueId || undefined,
      });
      trackContentAction("booking_intent", c.id, { source: "experiences" });
      if (c.priceCents > 0) {
        const res = await createBookingCheckoutSessionRemote({ bookingId });
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
          return;
        }
      }
      setJoined((j) => ({ ...j, [c.id]: true }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t start checkout.");
    } finally {
      setBusy(null);
    }
  }

  const nearbyCampaigns = useMemo(
    () => rows.filter((c) => locatedNear({ city: c.suburb }, here, city, usingGps, EVENT_NEAR_M)),
    [rows, here, city, usingGps],
  );
  const empty = !loading && nearbyCampaigns.length === 0 && livePlans.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
      >
        <ArrowLeft size={14} /> Explore
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Experiences</h1>
          <p className="mt-1 text-sm text-mute">Public events and experiences. Free or paid.</p>
        </div>
        <Button onClick={() => nav("/event/new?kind=experience")} className="h-11 rounded-full px-5">
          <Plus size={16} /> Create
        </Button>
      </div>
      <PaymentCanceledNotice />
      {bookedId ? <TicketPass bookingId={bookedId} /> : null}

      {loading && livePlans.length === 0 ? (
        <p className="mt-6 text-sm text-mute">Loading…</p>
      ) : empty ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-line bg-card p-8 text-center">
          <p className="font-display text-lg font-bold">Nothing live this week</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
            Host a free hangout or a paid class. Guests buy tickets on AirPal.
          </p>
          <Button className="mt-4" onClick={() => nav("/event/new")}>
            Create an event
          </Button>
        </div>
      ) : (
        <>
          {livePlans.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {livePlans.map((p) => (
                <EventTile key={p.id} plan={p} />
              ))}
            </div>
          )}
          {nearbyCampaigns.length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {nearbyCampaigns.map((c) => (
                <li key={c.id}>
                  <article className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
                    <div className="relative aspect-square bg-brand/10 text-brand">
                      <span className="grid h-full place-items-center font-display text-4xl font-bold">
                        {c.title[0]}
                      </span>
                      <span
                        className={cn(
                          "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          c.priceCents > 0 ? "bg-amber-400 text-slate-950" : "bg-white text-ink",
                        )}
                      >
                        {c.priceCents > 0 ? aud(c.priceCents) : "Free"}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 font-display text-[15px] font-bold leading-tight">{c.title}</p>
                      <p className="mt-1 truncate text-[12px] text-mute">
                        {c.businessName} · {c.date}
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        disabled={joined[c.id] || busy === c.id}
                        loading={busy === c.id}
                        onClick={() => void join(c)}
                      >
                        {joined[c.id] ? "You're in" : c.priceCents > 0 ? "Buy ticket" : "Join free"}
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
