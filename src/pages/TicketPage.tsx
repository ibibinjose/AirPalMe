import { useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { TicketGatePanel } from "@/components/booking/TicketGatePanel";
import { PageLoading } from "@/components/ui/PageLoading";
import { isTicketId } from "@shared/booking";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Dedicated gate page (`/ticket/:id`) for QR landings without a session
 * page (mate and campaign bookings). Guests are asked to sign in as staff;
 * signed-in non-staff get an honest answer, never ticket data.
 */
export function TicketPage() {
  const [, params] = useRoute("/ticket/:id");
  const { user, authReady } = useAuth();
  const id = params?.id || "";

  if (!isTicketId(id)) return <NotFoundPage />;
  if (!authReady) return <PageLoading />;
  if (!user) {
    return (
      <AuthGate
        next={`/ticket/${id}`}
        kicker="Gate"
        title="Verify this ticket"
        lede="Sign in with your organiser account to check this ticket in."
      />
    );
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-28">
      <TicketGatePanel ticketId={id} deniedMessage="Only this event's organiser can verify tickets." />
    </div>
  );
}
