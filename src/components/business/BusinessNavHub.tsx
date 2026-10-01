import { Link } from "wouter";
import { Building2, Cake, ClipboardList, Gift, Sparkles, ChevronRight, PlusCircle, Tag, Ticket } from "lucide-react";
import { TabPills } from "@/components/ui/TabPills";

export type BusinessRoleDomain = "venue" | "bookings" | "experiences" | "promotions" | "onboard";

interface BusinessNavHubProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  listingActive: boolean;
  dealLive: boolean;
  campaignCount: number;
  bookingCount: number;
  businessName: string;
}

export function BusinessNavHub({
  activeTab,
  onTabChange,
  listingActive,
  dealLive,
  campaignCount,
  bookingCount,
  businessName,
}: BusinessNavHubProps) {
  return (
    <div className="space-y-4">
      {/* Domain Role Quick Cards */}
      <div className="rounded-3xl ring-1 ring-line bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Your place</span>
            <h2 className="font-display mt-0.5 text-lg font-semibold text-ink">{businessName || "Your place"}</h2>
          </div>
          <Link
            href="/business/onboard"
            className="inline-flex items-center gap-1 rounded-full border border-line/20 bg-paper px-3 py-1 text-xs font-semibold text-ink hover:bg-card transition"
          >
            <PlusCircle size={13} /> Claim Venue
          </Link>
        </div>

        {/* Operational Metrics Strip */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-2xl bg-paper p-2 ring-1 ring-line">
            <p className="text-xs font-bold text-ink">{listingActive ? "Live" : "Draft"}</p>
            <p className="text-[10px] text-mute">Listing</p>
          </div>
          <div className="rounded-2xl bg-paper p-2 ring-1 ring-line">
            <p className="text-xs font-bold text-ink">{dealLive ? "Active" : "Off"}</p>
            <p className="text-[10px] text-mute">Offer</p>
          </div>
          <div className="rounded-2xl bg-paper p-2 ring-1 ring-line">
            <p className="text-xs font-bold text-ink">{campaignCount}</p>
            <p className="text-[10px] text-mute">Campaigns</p>
          </div>
          <div className="rounded-2xl bg-paper p-2 ring-1 ring-line">
            <p className="text-xs font-bold text-ink">{bookingCount}</p>
            <p className="text-[10px] text-mute">Bookings</p>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs font-semibold">
          <Link href="/helpdesk" className="inline-flex items-center gap-1 text-brand hover:underline">
            <span>🎧</span> Help Desk & Operations <ChevronRight size={12} />
          </Link>
          <Link href="/business/campaigns" className="inline-flex items-center gap-1 text-ink/75 hover:text-brand hover:underline">
            <Sparkles size={13} /> Experiences
          </Link>
          <Link href="/business/birthday-offers" className="inline-flex items-center gap-1 text-ink/75 hover:text-brand hover:underline">
            <Cake size={14} /> Birthday offers
          </Link>
          <Link href="/business/promotions" className="inline-flex items-center gap-1 text-ink/75 hover:text-brand hover:underline">
            <Gift size={13} /> Promotions
          </Link>
        </div>
      </div>

      {/* Role Domain Navigation Bar */}
      <TabPills
        ariaLabel="Business sections"
        items={[
          { id: "place", label: "Venue Info", icon: Building2, badge: listingActive ? "Live" : "Draft" },
          { id: "bookings", label: "Bookings", icon: Ticket, badge: String(bookingCount) },
          { id: "list", label: "Door List", icon: ClipboardList, badge: "Live" },
          { id: "offer", label: "Offers & Deals", icon: Tag, badge: dealLive ? "Live" : "Off" },
        ]}
        active={activeTab}
        onChange={onTabChange}
      />
    </div>
  );
}
