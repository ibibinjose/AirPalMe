import { useRef, useState } from "react";
import { CheckCircle, CreditCard, Lock, Minus, Plus, QrCode, Sparkles, Users, X } from "lucide-react";
import { type HangoutPlan, type PlanPricingTier, formatTime12h, isSoldOut, spotsLeft } from "@shared/plan";
import { Button } from "@/components/ui/Button";
import { currencyForCity, localeForCity } from "@/lib/cities";
import { formatMoney } from "@/lib/regions";
import { createExperienceCheckoutSessionRemote } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { createSubmitGuard } from "@/lib/submit-guard";

interface ExperienceBookingModalProps {
  plan: HangoutPlan;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: (bookingDetails: {
    spots: number;
    tierId?: string;
    totalAmount: number;
    depositPaid?: number;
    isDeposit: boolean;
  }) => void;
}

export function ExperienceBookingModal({ plan, isOpen, onClose, onBookingSuccess }: ExperienceBookingModalProps) {
  const [spots, setSpots] = useState(1);
  const [selectedTierId, setSelectedTierId] = useState<string>(() => {
    return plan.pricingTiers && plan.pricingTiers.length > 0 ? plan.pricingTiers[0]!.id : "";
  });
  const [paymentChoice, setPaymentChoice] = useState<"deposit" | "full">(() => {
    return plan.pricingModel === "deposit" ? "deposit" : "full";
  });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [payLater, setPayLater] = useState(false);
  // Synchronous double-tap guard: state-based `isProcessing` only disables the
  // button after a re-render, so a second tap can fire a second Stripe
  // checkout session (double charge risk) before the first resolves.
  const guardRef = useRef(createSubmitGuard());
  const { user, requireUser } = useAuth();

  if (!isOpen) return null;

  const selectedTier: PlanPricingTier | undefined = (plan.pricingTiers || []).find((t) => t.id === selectedTierId);

  const basePricePerPerson = selectedTier ? selectedTier.price : plan.pricePerPerson || 0;
  const totalPrice = basePricePerPerson * spots;

  const depositPerPerson = plan.pricingModel === "deposit" && plan.depositConfig ? plan.depositConfig.depositAmount : 0;
  const totalDeposit = depositPerPerson * spots;
  const remainingBalance = Math.max(0, totalPrice - totalDeposit);

  const amountToChargeNow = plan.pricingModel === "deposit" && paymentChoice === "deposit" ? totalDeposit : totalPrice;

  const [bookingRefId, setBookingRefId] = useState<string>("");

  const left = spotsLeft(plan);
  const soldOut = isSoldOut(plan);
  const maxSpots = left === null ? 20 : Math.max(1, left);
  const currency = plan.currency || currencyForCity(plan.city) || "AUD";
  const locale = localeForCity(plan.city);

  const handleConfirmBooking = async () => {
    if (!requireUser("Sign in to buy a ticket.")) return;
    if (!user) return;
    if (soldOut) {
      setBookingError("Sold out.");
      return;
    }
    if (!guardRef.current.tryAcquire()) return;
    setIsProcessing(true);
    setBookingError(null);
    void triggerHaptic("medium");

    try {
      const isDeposit = paymentChoice === "deposit" && plan.pricingModel === "deposit";
      const res = await createExperienceCheckoutSessionRemote({
        planId: plan.id,
        tierId: selectedTierId || undefined,
        spots,
        isDeposit,
        guestName: guestName.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
      });

      if (res.mode === "live_stripe" && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      if (!res.bookingId) {
        throw new Error("Ticket could not be created. Check your connection and try again.");
      }

      setBookingRefId(res.bookingId);
      setPayLater(res.mode === "sandbox_simulated");
      guardRef.current.release();
      setIsProcessing(false);
      setConfirmedBooking(true);
      void triggerHaptic("success");
      if (onBookingSuccess) {
        onBookingSuccess({
          spots,
          tierId: selectedTierId || undefined,
          totalAmount: totalPrice,
          depositPaid: amountToChargeNow,
          isDeposit: paymentChoice === "deposit" && plan.pricingModel === "deposit",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ticket purchase failed. Please try again.";
      guardRef.current.release();
      setIsProcessing(false);
      setBookingError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-3xl bg-card p-5 sm:p-6 shadow-2xl ring-1 ring-line space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-line/60">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
              <Sparkles size={13} />
              <span>Buy tickets</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-ink mt-0.5">{plan.title}</h2>
            <p className="text-xs text-mute">
              {plan.date} · {plan.time ? formatTime12h(plan.time) : ""} · {plan.destination || plan.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:text-ink hover:bg-paper transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={16} />
          </button>
        </div>

        {confirmedBooking ? (
          /* Confirmation Pass Screen */
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20">
              <CheckCircle size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink">Ticket confirmed</h3>
              <p className="text-xs text-mute max-w-xs mx-auto">
                You're in for <strong>{plan.title}</strong>. Show this pass at the door.
              </p>
            </div>

            {/* QR Pass Card */}
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line text-left space-y-3 max-w-sm mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-mute uppercase">Booking Pass</span>
                  <p className="text-sm font-bold text-ink font-mono">
                    {bookingRefId || `${plan.inviteCode}-${Math.floor(1000 + Math.random() * 9000)}`}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-card ring-1 ring-line">
                  <QrCode size={22} className="text-ink" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-line/60 pt-2">
                <div>
                  <span className="text-[10px] text-mute block">Guest:</span>
                  <span className="font-semibold text-ink">{guestName || "Registered Guest"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-mute block">Spots / Tier:</span>
                  <span className="font-semibold text-ink">
                    {spots} {spots > 1 ? "Guests" : "Guest"}
                    {selectedTier ? ` · ${selectedTier.name}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-mute block">{payLater ? "Due at the door:" : "Total Paid:"}</span>
                  <span className="font-bold text-brand">{formatMoney(amountToChargeNow, currency, locale)}</span>
                </div>
                {remainingBalance > 0 && (
                  <div>
                    <span className="text-[10px] text-mute block">Balance Due:</span>
                    <span className="font-bold text-amber-500">{formatMoney(remainingBalance, currency, locale)}</span>
                  </div>
                )}
              </div>
            </div>

            <Button type="button" onClick={onClose} className="w-full max-w-sm mx-auto h-11 rounded-2xl font-bold">
              Done
            </Button>
          </div>
        ) : (
          /* Booking Checkout Form */
          <div className="space-y-4">
            {/* Package / Tier Selector (if tiered) */}
            {plan.pricingTiers && plan.pricingTiers.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink block">
                  Select Room / Package Tier:
                </label>
                <div className="grid gap-2">
                  {plan.pricingTiers.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          setSelectedTierId(tier.id);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-2xl ring-1 transition text-left active:scale-[0.99]",
                          isSelected
                            ? "bg-brand/10 ring-brand text-brand shadow-xs"
                            : "bg-paper text-ink ring-line hover:bg-paper/80",
                        )}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold">{tier.name}</p>
                          {tier.description && (
                            <p className="text-[11px] text-mute truncate mt-0.5">{tier.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold">{formatMoney(tier.price, currency, locale)}</span>
                          <span className="text-[10px] text-mute block">per guest</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spots Counter */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-paper ring-1 ring-line">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <div>
                  <span className="text-xs font-bold text-ink block">Number of Guests</span>
                  <span className="text-[10px] text-mute">
                    {formatMoney(basePricePerPerson, currency, locale)} each
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={spots <= 1}
                  onClick={() => {
                    void triggerHaptic("light");
                    setSpots((s) => Math.max(1, s - 1));
                  }}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-card ring-1 ring-line text-ink disabled:opacity-30 hover:bg-paper active:scale-95"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-bold text-ink tabular-nums">{spots}</span>
                <button
                  type="button"
                  disabled={spots >= maxSpots || soldOut}
                  onClick={() => {
                    void triggerHaptic("light");
                    setSpots((s) => Math.min(maxSpots, s + 1));
                  }}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-card ring-1 ring-line text-ink disabled:opacity-30 hover:bg-paper active:scale-95"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Deposit Payment Selector (if deposit supported) */}
            {plan.pricingModel === "deposit" && plan.depositConfig && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink block">Payment Option:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setPaymentChoice("deposit");
                    }}
                    className={cn(
                      "p-3 rounded-2xl text-left ring-1 transition active:scale-95",
                      paymentChoice === "deposit"
                        ? "bg-brand/10 ring-brand text-brand font-semibold shadow-xs"
                        : "bg-paper text-ink ring-line hover:bg-paper/80",
                    )}
                  >
                    <span className="text-xs font-bold block">Pay Deposit Now</span>
                    <span className="text-sm font-bold text-brand">{formatMoney(totalDeposit, currency, locale)}</span>
                    <span className="text-[10px] text-mute block mt-0.5">
                      Remaining {formatMoney(remainingBalance, currency, locale)} due{" "}
                      {plan.depositConfig.balanceDueDaysBefore || 14} days before
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setPaymentChoice("full");
                    }}
                    className={cn(
                      "p-3 rounded-2xl text-left ring-1 transition active:scale-95",
                      paymentChoice === "full"
                        ? "bg-brand/10 ring-brand text-brand font-semibold shadow-xs"
                        : "bg-paper text-ink ring-line hover:bg-paper/80",
                    )}
                  >
                    <span className="text-xs font-bold block">Pay in Full</span>
                    <span className="text-sm font-bold text-brand">{formatMoney(totalPrice, currency, locale)}</span>
                    <span className="text-[10px] text-mute block mt-0.5">Instant complete settlement</span>
                  </button>
                </div>
              </div>
            )}

            {/* Guest Details */}
            <div className="space-y-2.5 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-mute block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="h-10 w-full rounded-xl bg-paper px-3 text-xs text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-mute block mb-1">Email for Confirmation</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="h-10 w-full rounded-xl bg-paper px-3 text-xs text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-mute block mb-1">Dietary / Notes (optional)</label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Vegetarian, surf beginner, celebration arrival"
                  className="h-10 w-full rounded-xl bg-paper px-3 text-xs text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
            </div>

            {/* Price Breakdown Summary */}
            <div className="rounded-2xl bg-paper/80 p-3.5 ring-1 ring-line space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-mute">
                <span>
                  {spots} × {selectedTier ? selectedTier.name : "Experience Ticket"}
                </span>
                <span>{formatMoney(totalPrice, currency, locale)}</span>
              </div>
              {plan.pricingModel === "deposit" && paymentChoice === "deposit" && (
                <div className="flex items-center justify-between text-mute">
                  <span>Balance payable later:</span>
                  <span>{formatMoney(remainingBalance, currency, locale)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-ink text-sm border-t border-line/60 pt-1.5 mt-1">
                <span>Total Due Now:</span>
                <span className="text-brand text-base">{formatMoney(amountToChargeNow, currency, locale)}</span>
              </div>
            </div>

            {bookingError && (
              <p
                role="alert"
                className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 ring-1 ring-red-500/30"
              >
                {bookingError}
              </p>
            )}

            {/* Secure Checkout Button */}
            <Button
              type="button"
              disabled={isProcessing || soldOut}
              onClick={() => void handleConfirmBooking()}
              className="w-full h-12 rounded-2xl text-sm font-bold gap-2 shadow-md"
            >
              {isProcessing ? (
                <span>Opening checkout…</span>
              ) : soldOut ? (
                <span>Sold out</span>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Pay {formatMoney(amountToChargeNow, currency, locale)}</span>
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1 text-[11px] text-mute/80 text-center">
              <CreditCard size={12} />
              <span>Card checkout on Stripe. Your ticket appears after payment.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
