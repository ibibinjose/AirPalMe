import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, QrCode, Receipt, Store, Ticket, Wallet } from "lucide-react";
import { useMyBookings } from "@/hooks/useMyBookings";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

type WalletTab = "deals" | "redeemed" | "payments";

export function WalletPage() {
  const { bookings } = useMyBookings();
  const [tab, setTab] = useState<WalletTab>("deals");

  // Sample curated active perks collected from events & partner venues
  const activePerks = useMemo(
    () => [
      {
        id: "perk-argyle-cocktail",
        title: "2-for-1 Signature Cocktails",
        merchant: "The Argyle Sydney",
        category: "Dining & Drinks",
        discount: "50% OFF",
        expires: "Valid until 30 Nov",
        code: "AIRPAL-ARG-24",
      },
      {
        id: "perk-pancakes-dessert",
        title: "Complimentary Sweet Pancake Stack",
        merchant: "Pancakes On The Rocks",
        category: "Food & Dessert",
        discount: "FREE ITEM",
        expires: "Valid until 15 Dec",
        code: "AIRPAL-POTR-FREE",
      },
      {
        id: "perk-harbour-cruise",
        title: "20% Off Sunset Harbour Ferry Tour",
        merchant: "Captain Cook Cruises",
        category: "Experience",
        discount: "20% OFF",
        expires: "Valid until 31 Dec",
        code: "AIRPAL-CRUISE-20",
      },
    ],
    [],
  );

  // Redeemed vouchers history
  const redeemedVouchers = useMemo(
    () => [
      {
        id: "red-01",
        title: "$10 Dining Credit",
        merchant: "Munich Brauhaus",
        redeemedAt: "18 Oct 2026, 8:45 PM",
        savings: "$10.00",
        code: "MB-88319-USE",
      },
      {
        id: "red-02",
        title: "Free Barista Flat White",
        merchant: "La Renaissance Patisserie",
        redeemedAt: "12 Oct 2026, 10:15 AM",
        savings: "$5.50",
        code: "LR-11920-USE",
      },
    ],
    [],
  );

  // Payment transactions derived from bookings or simulated Stripe pass purchases
  const payments = useMemo(() => {
    if (bookings.length > 0) {
      return bookings.map((b) => ({
        id: b.id,
        item: b.title,
        amount: b.priceCents ? `$${(b.priceCents / 100).toFixed(2)} AUD` : "$25.00 AUD",
        date: b.createdAt || "Recent",
        status: "Paid",
        method: "Stripe / Apple Pay",
      }));
    }
    return [
      {
        id: "pay-101",
        item: "Sydney Harbour Live Music Gala (VIP Pass)",
        amount: "$45.00 AUD",
        date: "10 Oct 2026",
        status: "Paid",
        method: "Stripe / Apple Pay",
      },
      {
        id: "pay-102",
        item: "Surry Hills Tech & AI Founder Mixer",
        amount: "$0.00 AUD (Free RSVP)",
        date: "05 Oct 2026",
        status: "Confirmed",
        method: "Direct RSVP",
      },
    ];
  }, [bookings]);

  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/pass"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>AirPal Pass</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Wallet</span>
        </div>

        <Link
          href="/me/tickets"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
        >
          <Ticket size={14} className="text-accent" />
          <span>My Event Passes</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Wallet size={28} className="text-accent" />
            <span>My Wallet</span>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Redeemed vouchers, payment receipts, and promotional perks collected from events.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {[
          { id: "deals" as const, label: `Active Perks (${activePerks.length})` },
          { id: "redeemed" as const, label: `Redeemed Vouchers (${redeemedVouchers.length})` },
          { id: "payments" as const, label: `Payment History (${payments.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              void triggerHaptic("selection");
              setTab(t.id);
            }}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold ring-1 transition cursor-pointer",
              tab === t.id
                ? "bg-brand text-white ring-brand shadow-xs"
                : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Active Promotional Deals */}
      {tab === "deals" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-mute">Perks unlocked from attending partner events and precinct experiences.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activePerks.map((perk) => (
              <div
                key={perk.id}
                className="flex flex-col justify-between rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-500/20">
                      {perk.discount}
                    </span>
                    <span className="text-[11px] text-mute">{perk.expires}</span>
                  </div>
                  <h3 className="font-display mt-2 text-base font-bold text-ink">{perk.title}</h3>
                  <p className="text-xs text-mute flex items-center gap-1 mt-0.5">
                    <Store size={12} />
                    <span>{perk.merchant}</span>
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3.5">
                  <span className="font-mono text-xs font-semibold text-accent">{perk.code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("medium");
                      setActiveVoucherCode(perk.code);
                      toast.success(`Redemption barcode shown for ${perk.merchant}`);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition cursor-pointer"
                  >
                    <QrCode size={13} />
                    <span>Redeem at Counter</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Redeemed Vouchers */}
      {tab === "redeemed" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-mute">Vouchers and discounts successfully claimed in person.</p>
          <div className="space-y-3">
            {redeemedVouchers.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs opacity-90"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink">{v.title}</h3>
                    <p className="text-xs text-mute">
                      {v.merchant} · Redeemed on {v.redeemedAt}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">{v.savings}</span>
                  <p className="text-[10px] text-mute uppercase font-mono">{v.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Payment History */}
      {tab === "payments" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-mute">All Stripe ticket purchases and checkout receipts.</p>
          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Receipt size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-sm font-bold text-ink">{p.item}</h3>
                    <p className="text-xs text-mute">
                      {p.date} · {p.method}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-ink">{p.amount}</span>
                  <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 size={11} />
                    <span>{p.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voucher Code Modal */}
      {activeVoucherCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center ring-1 ring-line shadow-2xl">
            <h3 className="font-display text-lg font-bold text-ink">Present Voucher at Counter</h3>
            <p className="mt-1 text-xs text-mute">Merchant staff will scan or record this code.</p>

            <div className="my-6 rounded-2xl bg-white p-6 shadow-inner flex flex-col items-center justify-center">
              <QrCode size={140} className="text-neutral-900" />
              <div className="mt-3 font-mono text-sm font-bold tracking-widest text-neutral-900">
                {activeVoucherCode}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveVoucherCode(null)}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
