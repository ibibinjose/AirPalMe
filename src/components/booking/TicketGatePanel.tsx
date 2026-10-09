import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Loader2, ScanLine, ShieldAlert, TicketX } from "lucide-react";
import { toast } from "sonner";
import { admitTicketRemote, verifyTicketRemote } from "@/lib/functions";
import { createSubmitGuard } from "@/lib/submit-guard";
import { Button } from "@/components/ui/Button";
import { ticketAdmitReasonLabel, type TicketAdmitReason } from "@shared/booking";

type GateTicket = {
  ticketId: string;
  eventName: string;
  title: string;
  date: string;
  time: string;
  spots: number;
  displayPaid: boolean;
  status: string;
  valid: boolean;
  reason: string | null;
  admittedAt: string | null;
};

function callableCode(err: unknown): string {
  return (err as { code?: string } | null)?.code || "";
}

function isSilentDenial(err: unknown): boolean {
  const code = callableCode(err);
  return (
    code === "functions/permission-denied" ||
    code === "permission-denied" ||
    code === "functions/not-found" ||
    code === "not-found" ||
    code === "functions/unauthenticated" ||
    code === "unauthenticated" ||
    code === "functions/invalid-argument" ||
    code === "invalid-argument"
  );
}

function shortId(id: string): string {
  return id.length > 14 ? `…${id.slice(-10)}` : id;
}

/**
 * Gate-scan card for QR landings. Renders only for staff the server entitles
 * (organiser, provider, admin). Mounts on session pages leave denials silent
 * (the page behind is the content); pass `deniedMessage` when the card IS the
 * page so a denial reads as an answer, not a blank screen.
 */
export function TicketGatePanel({
  ticketId,
  deniedMessage,
}: {
  ticketId: string;
  deniedMessage?: string;
}) {
  const [ticket, setTicket] = useState<GateTicket | null>(null);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const guardRef = useRef(createSubmitGuard());

  const verify = useCallback(
    async (isCancelled?: () => boolean) => {
      setFailed(false);
      try {
        const res = await verifyTicketRemote({ ticketId });
        if (isCancelled?.()) return;
        setTicket(res);
      } catch (err) {
        if (isCancelled?.()) return;
        if (isSilentDenial(err)) {
          setDenied(true);
          return;
        }
        setFailed(true);
      }
    },
    [ticketId],
  );

  useEffect(() => {
    let cancelled = false;
    setTicket(null);
    setDenied(false);
    void verify(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [verify]);

  async function admit() {
    if (!guardRef.current.tryAcquire()) return;
    setAdmitting(true);
    try {
      const res = await admitTicketRemote({ ticketId });
      setTicket((prev) => (prev ? { ...prev, admittedAt: res.admittedAt } : prev));
      toast.success(res.already ? "Already admitted — no double entry." : "Guest admitted.");
    } catch (err) {
      if (isSilentDenial(err)) {
        setDenied(true);
        return;
      }
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't admit this ticket.");
      // Re-verify so a state change (cancel, refund) shows instead of going stale.
      void verify();
    } finally {
      setAdmitting(false);
    }
  }

  if (denied && !deniedMessage) return null;

  return (
    <section
      aria-label="Gate ticket check"
      className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs"
    >
      {denied && deniedMessage && (
        <p className="flex items-center gap-2 text-sm font-semibold leading-5 text-mute">
          <ShieldAlert size={16} className="shrink-0" /> {deniedMessage}
        </p>
      )}
      {!denied && !ticket && !failed && (
        <p className="flex items-center gap-2 text-sm font-semibold text-mute" aria-busy="true">
          <Loader2 size={16} className="animate-spin" /> Verifying ticket…
        </p>
      )}
      {!denied && failed && !ticket && (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <TicketX size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Couldn&apos;t verify this ticket</p>
            <p className="text-xs text-mute">Check the connection and retry.</p>
          </div>
          <Button size="sm" variant="outlined" onClick={() => void verify()}>
            Retry
          </Button>
        </div>
      )}
      {!denied && ticket && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
            <ScanLine size={14} /> Gate · Ticket {shortId(ticket.ticketId)}
          </p>
          <p className="mt-1.5 text-lg font-bold leading-snug text-ink">
            {ticket.eventName || ticket.title || "Event ticket"}
          </p>
          <p className="mt-0.5 text-[13px] text-mute">
            {[ticket.date, ticket.time, ticket.spots > 1 ? `${ticket.spots} guests` : "1 guest"]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                ticket.displayPaid
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25"
                  : "bg-amber-500/10 text-amber-700 ring-amber-500/25"
              }`}
            >
              {ticket.displayPaid ? "Paid" : "Unpaid"}
            </span>
            {ticket.admittedAt ? (
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-accent ring-1 ring-brand/20">
                Admitted {ticket.admittedAt.slice(11, 16) || ticket.admittedAt}
              </span>
            ) : ticket.valid ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/25">
                Valid — ready to admit
              </span>
            ) : (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-500/25">
                No entry
              </span>
            )}
          </div>
          {!ticket.valid && !ticket.admittedAt && ticket.reason && (
            <p className="mt-2.5 text-[13px] font-semibold leading-5 text-ink">
              {ticketAdmitReasonLabel(ticket.reason as TicketAdmitReason)}
            </p>
          )}
          {ticket.valid && !ticket.admittedAt && (
            <Button
              className="mt-3 w-full gap-1.5"
              disabled={admitting}
              onClick={() => void admit()}
            >
              <BadgeCheck size={16} />
              {admitting
                ? "Admitting…"
                : ticket.spots > 1
                  ? `Admit ${ticket.spots} guests`
                  : "Admit guest"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
