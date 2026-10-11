export interface TicketFieldValues {
  paid: boolean;
  /** Dollars, e.g. "25". */
  price: string;
  /** Seats, e.g. "40". Empty = unlimited. */
  capacity: string;
}

interface Props {
  values: TicketFieldValues;
  onChange: (next: TicketFieldValues) => void;
}

/** Validate ticket fields. Returns the error message, or null when valid. */
export function validateTickets(values: TicketFieldValues): string | null {
  if (!values.paid) return null;
  const price = Number(String(values.price).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(price) || price <= 0) return "Enter a ticket price, or switch to Free.";
  if (values.capacity.trim()) {
    const cap = Number(values.capacity.trim());
    if (!Number.isInteger(cap) || cap < 1 || cap > 2000) return "Capacity must be 1–2000, or leave it empty.";
  }
  return null;
}

/** Dollars → cents for the events engine. */
export function ticketValuesToCents(values: TicketFieldValues): { ticketPriceCents?: number; capacity?: number } {
  if (!values.paid) return { ticketPriceCents: undefined, capacity: undefined };
  const cents = Math.max(0, Math.round(Number(String(values.price).replace(/[^0-9.]/g, "")) * 100));
  const capRaw = values.capacity.trim();
  const cap = capRaw ? Math.floor(Number(capRaw)) : undefined;
  return {
    ticketPriceCents: cents > 0 ? cents : undefined,
    capacity: cap && Number.isInteger(cap) && cap >= 1 && cap <= 2000 ? cap : undefined,
  };
}

export function EventTicketFields({ values, onChange }: Props) {
  const set = (patch: Partial<TicketFieldValues>) => onChange({ ...values, ...patch });
  const input =
    "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60";
  return (
    <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Tickets</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            [false, "Free entry"],
            [true, "Paid · Stripe checkout"],
          ] as const
        ).map(([id, label]) => {
          const on = values.paid === id;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => set({ paid: id })}
              className={
                on
                  ? "rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition text-left bg-brand text-white ring-brand shadow-sm"
                  : "rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition text-left bg-paper text-mute ring-line hover:text-ink"
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      {values.paid && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Price (AUD)</label>
            <input
              value={values.price}
              onChange={(e) => set({ price: e.target.value })}
              placeholder="25"
              inputMode="decimal"
              className={input}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
              Capacity (optional)
            </label>
            <input
              value={values.capacity}
              onChange={(e) => set({ capacity: e.target.value })}
              placeholder="40"
              inputMode="numeric"
              className={input}
            />
          </div>
        </div>
      )}
      <p className="text-[11px] text-mute leading-relaxed">
        {values.paid
          ? "Guests pay by card at checkout. The platform fee comes from admin settings — you receive the night's takings after the event."
          : "Free nights use the I'm-going RSVP. Switch to paid any time before tickets sell."}
      </p>
    </div>
  );
}
