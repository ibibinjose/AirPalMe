import { useLocation } from "wouter";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { AIRPAL_CLUB_ID } from "@/contexts/ClubContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";

export function ClubListPage() {
  const [, nav] = useLocation();
  const { user, isAdmin } = useAuth();
  const { business } = useBio();
  const clubId = business?.handle || (isAdmin ? AIRPAL_CLUB_ID : "");
  const clubName = business?.name || "AirPal Club";

  if (!user) {
    return (
      <AuthGate
        next="/club/list"
        kicker="Guest list"
        title="Mail the list"
        lede="Sign in or create an account first. Then you can email the door list."
      />
    );
  }

  if (!clubId) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Guest list</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Host a club first</h1>
        <p className="mt-2 text-sm text-mute">
          A registered business gets a guest list. AirPal Club members can be imported.
        </p>
        <Button className="mt-6" onClick={() => nav("/bio/setup?kind=business")}>
          Host a business
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Guest list</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{clubName}</h1>
      <p className="mt-2 text-sm text-mute">
        Mail invites to people who asked. Import AirPal Club if they opted in for invites.
      </p>
      {isAdmin && business && (
        <button type="button" className="mt-3 text-sm text-brand" onClick={() => nav("/admin")}>
          Also send as AirPal Club from Network
        </button>
      )}
      <GuestListPanel clubId={clubId} clubName={clubName} />
    </div>
  );
}
