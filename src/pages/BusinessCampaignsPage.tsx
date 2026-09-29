import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Crown, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
import { completePaidBookingRemote } from "@/lib/functions";
import type { Booking } from "@shared/booking";
import { isSubscriptionActive, type BusinessSubscription } from "@shared/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import {
  CAMPAIGN_CATEGORIES,
  aud,
  campaignValid,
  emptyCampaign,
  fillRate,
  projectedRevenue,
  type Campaign,
} from "@shared/campaign";

const inputCls =
  "mt-1 min-h-[48px] w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none placeholder:text-mute focus:border-brand";

interface BookingRow {
  id: string;
  customerUid: string;
  status: string;
  createdAt: string;
  paymentStatus?: string;
}

function moneyToCents(text: string): number {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function BusinessCampaignsPage() {
  const { user, authReady, requireUser } = useAuth();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCampaign());
  const [budgetText, setBudgetText] = useState("1000");
  const [priceText, setPriceText] = useState("0");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [roster, setRoster] = useState<Record<string, BookingRow[]>>({});
  const [partner, setPartner] = useState(false);

  // C4 — campaigns are the Partner tool; rows stay visible, creation gates.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user) {
      setPartner(false);
      return;
    }
    void getDoc(doc(db, "business_subscriptions", user.uid))
      .then((snap) => {
        setPartner(snap.exists() && isSubscriptionActive(snap.data() as BusinessSubscription));
      })
      .catch(() => setPartner(false));
  }, [user]);

  const reload = useCallback(async () => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "campaigns"), where("ownerUid", "==", user.uid)));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, "id">) }));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authReady) return;
    void reload();
  }, [authReady, reload]);

  async function loadRoster(c: Campaign) {
    if (roster[c.id]) return;
    const db = getFirebaseDb();
    if (!db) return;
    try {
      // Shared bookings engine (§9). Query by providerUid (rules-safe); filter campaign client-side.
      const snap = await getDocs(query(collection(db, "bookings"), where("providerUid", "==", user!.uid)));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
        .filter((b) => b.campaignId === c.id && b.status !== "cancelled" && b.status !== "refunded")
        .map((b) => ({
          id: b.id,
          customerUid: b.customerUid,
          status: b.status,
          createdAt: b.createdAt,
          paymentStatus: b.paymentStatus,
        }));
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setRoster((r) => ({ ...r, [c.id]: list }));
    } catch {
      setRoster((r) => ({ ...r, [c.id]: [] }));
    }
  }

  async function create() {
    setError(null);
    if (!requireUser("Sign in to create an AirPal Experience.")) return;
    if (!user) return;
    const input = {
      ...form,
      businessName: form.businessName.trim(),
      title: form.title.trim(),
      brief: form.brief.trim(),
      suburb: form.suburb.trim(),
      budgetCents: moneyToCents(budgetText),
      priceCents: moneyToCents(priceText),
    };
    if (!campaignValid(input)) {
      setError("Check the brief (min 20 characters), numbers and dates.");
      return;
    }
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — campaigns file through the live backend.");
      return;
    }
    setSending(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "campaigns"), {
        ownerUid: user.uid,
        ...input,
        paymentStatus: "deferred",
        status: "pending",
        adminNote: "",
        createdAt: now,
        updatedAt: now,
      });
      setForm(emptyCampaign());
      setBudgetText("1000");
      setPriceText("0");
      setShowForm(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file the campaign. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <Link
        href="/studio"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
      >
        <ArrowLeft size={14} /> Studio
      </Link>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Studio · B2B</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Create an AirPal Experience</h1>
      <p className="mt-1 text-sm leading-6 text-mute">
        File the brief, go live, and guests buy tickets on AirPal. Your share is sent after you mark a booking
        delivered.
      </p>
      <PayoutSetupCard />

      {partner ? (
        <Button className="mt-4" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? "Close brief" : "New campaign"}
        </Button>
      ) : (
        <div className="mt-4 rounded-2xl border border-line bg-card p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Crown size={14} className="text-gold" /> Campaigns are a Partner tool
          </p>
          <p className="mt-1 text-[13px] text-mute">
            Your place, offers, and bookings stay free. Become a Partner on your business page to file campaigns
            that fill seats.
          </p>
          <Link
            href="/business"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
          >
            Open Partner on /business
          </Link>
        </div>
      )}

      {showForm && partner && (
        <div className="mt-3 space-y-3 rounded-2xl border border-line bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold">Business</span>
              <input
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className={inputCls}
                placeholder="Harbour View Hotel"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Suburb</span>
              <input
                value={form.suburb}
                onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
                className={inputCls}
                placeholder="The Rocks"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[13px] font-semibold">Experience title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
              placeholder="Rooftop tasting night"
              maxLength={80}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">The brief (min 20 characters)</span>
            <textarea
              value={form.brief}
              onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
              rows={3}
              className={inputCls}
              placeholder="Twenty guests, three pours, one harbour sunset. We host, AirPal recruits."
              maxLength={600}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-[13px] font-semibold">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputCls}
              >
                {CAMPAIGN_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Time</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className={inputCls}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="text-[13px] font-semibold">Capacity</span>
              <input
                type="number"
                min={2}
                max={500}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Recruit target</span>
              <input
                type="number"
                min={1}
                max={500}
                value={form.recruitTarget}
                onChange={(e) => setForm((f) => ({ ...f, recruitTarget: Number(e.target.value) }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Budget</span>
              <input
                inputMode="decimal"
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                className={inputCls}
                placeholder="1000"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Ticket price</span>
              <input
                inputMode="decimal"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                className={inputCls}
                placeholder="0 = free"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-[13px] font-medium text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={sending} loading={sending} onClick={() => void create()}>
            <Megaphone size={15} /> File campaign
          </Button>
        </div>
      )}

      <h2 className="font-display mt-8 text-xl font-bold">Your campaigns</h2>
      {loading ? (
        <p className="mt-2 text-sm text-mute">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-mute">
          Nothing filed yet. The first $1,000-style campaign starts with one brief.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((c) => {
            const seats = (roster[c.id] || []).length;
            const fill = fillRate(seats, c.capacity);
            return (
              <li key={c.id} className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(openId === c.id ? null : c.id);
                    void loadRoster(c);
                  }}
                  aria-expanded={openId === c.id}
                  className="flex min-h-[44px] w-full items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{c.title}</span>
                    <span className="block text-xs text-mute">
                      {c.suburb} · {c.date} · {seats}/{c.capacity} booked
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                      c.status === "live"
                        ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30"
                        : "bg-brand/10 text-brand ring-brand/30",
                    )}
                  >
                    {c.status}
                  </span>
                </button>
                {openId === c.id && (
                  <div className="mt-3 border-t border-line pt-3 text-[13px]">
                    <div className="h-2 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                      <div className="h-full bg-brand" style={{ width: `${Math.round(fill * 100)}%` }} />
                    </div>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-mute">Bookings vs recruit target</dt>
                        <dd className="font-semibold">
                          {seats} / {c.recruitTarget}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-mute">Ticket revenue (paid + unpaid holds)</dt>
                        <dd className="font-semibold">{aud(projectedRevenue(c.priceCents, seats))}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-mute">Budget</dt>
                        <dd className="font-semibold">{aud(c.budgetCents)}</dd>
                      </div>
                      {c.adminNote && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-mute">Team note</dt>
                          <dd className="text-right font-semibold">{c.adminNote}</dd>
                        </div>
                      )}
                    </dl>
                    {(roster[c.id] || []).length > 0 && (
                      <ul className="mt-3 divide-y divide-line">
                        {(roster[c.id] || []).map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                            <span className="text-xs text-mute">
                              {b.paymentStatus === "paid" ? "Paid" : "Unpaid"} · {b.status}
                            </span>
                            {b.paymentStatus === "paid" && b.status !== "completed" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  void completePaidBookingRemote({ bookingId: b.id }).then(() => {
                                    setRoster((r) => {
                                      const next = { ...r };
                                      delete next[c.id];
                                      return next;
                                    });
                                    void loadRoster(c);
                                  });
                                }}
                              >
                                Mark delivered
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
