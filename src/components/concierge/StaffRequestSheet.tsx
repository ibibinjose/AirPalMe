import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useLocale } from "@/contexts/LocaleContext";
import { categoryFromGuestText, submitStaffTicket } from "@/lib/tickets-store";
import { isDuplicateSubmission, submissionFingerprint } from "@shared/abuse";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

const QUICK_REQUESTS = ["Towels", "Clean", "Late checkout", "Extra night", "Room move", "Early check-in"];

export function StaffRequestSheet({
  open,
  onClose,
  propertyId,
  propertyName,
  roomLabel,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  roomLabel: string;
}) {
  const { t } = useLocale();
  const [ticket, setTicket] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const lastTicketAt = useState(() => ({ at: 0, fingerprint: "" }))[0];

  return (
    <Sheet open={open} onClose={onClose} title={t("staff")}>
      <textarea
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
        placeholder="Towels, extra pillow, AC…"
        aria-label="Describe your request for the front desk"
        className="h-28 w-full rounded-2xl bg-paper p-3 text-[15px] font-medium outline-none ring-1 ring-line transition focus:border-brand focus:ring-2 focus:ring-brand"
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_REQUESTS.map((quick) => {
          const selected = ticket === quick;
          return (
            <button
              key={quick}
              type="button"
              aria-pressed={selected}
              onClick={() => setTicket(quick)}
              className={cn(
                "min-h-[44px] rounded-full text-xs font-bold ring-1 ring-line transition active:scale-95 shadow-xs",
                selected ? "bg-brand text-white" : "bg-paper text-ink hover:bg-card",
              )}
            >
              {quick}
            </button>
          );
        })}
      </div>
      <Button
        className="mt-4 w-full font-bold shadow-xs"
        loading={ticketSending}
        onClick={() => {
          if (!ticket.trim() || ticketSending) return;
          if (!propertyId || propertyId === "unknown" || !propertyName) {
            toast.error("This stay isn’t listed yet. Ask the desk.");
            return;
          }
          const fingerprint = submissionFingerprint([propertyId, roomLabel, ticket.trim()]);
          if (fingerprint === lastTicketAt.fingerprint && isDuplicateSubmission(lastTicketAt.at)) {
            toast.message("Already sent");
            return;
          }
          lastTicketAt.fingerprint = fingerprint;
          lastTicketAt.at = Date.now();
          const details = ticket.trim();
          const category = categoryFromGuestText(details);
          setTicketSending(true);
          void (async () => {
            try {
              const saved = await submitStaffTicket({
                propertyId,
                details,
                roomNumber: roomLabel || "Guest",
                category,
              });
              void track("support_request", {
                contextId: propertyId,
                requestId: saved.id,
                category,
                priority: saved.urgency,
              });
              toast.success("Sent to front desk", {
                description: `Room ${roomLabel || "Guest"} · the host is notified.`,
              });
              onClose();
              setTicket("");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn’t send. Ask the desk.");
            } finally {
              setTicketSending(false);
            }
          })();
        }}
      >
        {ticketSending ? "Sending…" : "Send Request"}
      </Button>
    </Sheet>
  );
}
