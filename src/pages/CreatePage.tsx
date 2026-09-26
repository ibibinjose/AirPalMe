import { Link } from "wouter";
import {
  BadgePercent,
  Building2,
  CalendarDays,
  CalendarPlus,
  Handshake,
  Lock,
  Megaphone,
  PartyPopper,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { createItemsFor, hasPartnerProfile, type CreateItem } from "@shared/create";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

const ICONS: Record<string, typeof Users> = {
  plan: CalendarPlus,
  "mate-request": Users,
  "mate-apply": Handshake,
  pulse: Sparkles,
  event: Ticket,
  festival: PartyPopper,
  business: Building2,
  stay: CalendarDays,
  promotion: BadgePercent,
  campaigns: Megaphone,
};

function CreateCard({ item, locked, signedIn }: { item: CreateItem; locked?: boolean; signedIn: boolean }) {
  const Icon = ICONS[item.id] || Sparkles;
  // Guests pick first, sign in second — the builder opens right after auth.
  const href = locked ? "/join" : signedIn ? item.href : `/start?tab=signup&next=${encodeURIComponent(item.href)}`;
  const body = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
          {item.label}
          {locked && <Lock size={13} className="text-mute" />}
        </span>
        <span className="block truncate text-[13px] text-mute">{item.hint}</span>
      </span>
      <span className="shrink-0 text-[13px] font-bold text-brand">{locked ? "Unlock" : "Open →"}</span>
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-line shadow-xs transition active:scale-[0.99] hover:ring-brand/40";
  return (
    <Link
      href={href}
      onClick={() => {
        void triggerHaptic("light");
      }}
      className={cls}
    >
      {body}
    </Link>
  );
}

/**
 * One door for everything the account can create. Individuals see personal
 * tools; partner tools unlock once the same account holds a partner
 * profile — never a second login. Guests see the map and sign in at action.
 */
export function CreatePage() {
  const { user } = useAuth();
  const { business } = useBio();
  const partner = hasPartnerProfile({
    businessHandle: business?.handle,
    propertyCount: user?.propertyIds?.length || 0,
  });
  const { individual, partner: partnerItems, gated } = createItemsFor({
    signedIn: Boolean(user),
    hasPartnerProfile: partner,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Create</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink">What do you want to make?</h1>
      <p className="mt-2 text-[14px] text-mute">
        {user
          ? partner
            ? "One account, both hats — personal and partner tools, side by side."
            : "Personal tools below. Run a business? Unlock partner tools with the same login."
          : "Sign in when you pick one — guests can look around first."}
      </p>

      <h2 className="mt-6 text-[12px] font-bold uppercase tracking-wider text-mute">For you</h2>
      <div className="mt-2 space-y-2">
        {individual.map((item) => (
          <CreateCard key={item.id} item={item} signedIn={Boolean(user)} />
        ))}
      </div>

      <h2 className="mt-6 text-[12px] font-bold uppercase tracking-wider text-mute">For your business</h2>
      {partnerItems.length > 0 ? (
        <div className="space-y-2">
          {partnerItems.map((item) => (
            <CreateCard key={item.id} item={item} signedIn={Boolean(user)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {gated.map((item) => (
            <CreateCard key={item.id} item={item} locked signedIn={Boolean(user)} />
          ))}
          <div className="rounded-3xl bg-card p-5 text-center ring-1 ring-line shadow-xs">
            <Handshake size={22} className="mx-auto text-brand" />
            <p className="mt-2 text-[15px] font-bold text-ink">Partner tools need a partner profile</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-mute">
              Same login, second hat — open a partner account and unlock events, stays, listings, and promotions.
            </p>
            <div className={cn("mt-3 flex justify-center gap-2")}>
              <Link href="/join">
                <Button size="sm">Open partner account</Button>
              </Link>
              <Link href="/partner">
                <Button size="sm" variant="ghost">
                  Talk to us first
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
