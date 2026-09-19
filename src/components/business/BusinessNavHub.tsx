import { Link } from "wouter";
import { Gift, Sparkles, ChevronRight, PlusCircle } from "lucide-react";
import { cn } from "@/lib/cn";

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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Your place</span>
            <h2 className="text-base font-bold text-ink">{businessName || "Your place"}</h2>
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
          <div className="rounded-2xl border border-line bg-paper p-2">
            <p className="text-xs font-bold text-ink">{listingActive ? "Live" : "Draft"}</p>
            <p className="text-[10px] text-mute">Listing</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-2">
            <p className="text-xs font-bold text-ink">{dealLive ? "Active" : "Off"}</p>
            <p className="text-[10px] text-mute">Offer</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-2">
            <p className="text-xs font-bold text-ink">{campaignCount}</p>
            <p className="text-[10px] text-mute">Campaigns</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-2">
            <p className="text-xs font-bold text-ink">{bookingCount}</p>
            <p className="text-[10px] text-mute">Bookings</p>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs font-semibold">
          <Link href="/business/campaigns" className="inline-flex items-center gap-1 text-brand hover:underline">
            <Sparkles size={13} /> Manage Experiences <ChevronRight size={12} />
          </Link>
          <Link href="/business/promotions" className="inline-flex items-center gap-1 text-brand hover:underline">
            <Gift size={13} /> Promotions & Giveaways <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Role Domain Navigation Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "place", label: "🏢 Venue Info", badge: listingActive ? "Live" : "Draft" },
          { id: "bookings", label: "🎟️ Bookings", badge: String(bookingCount) },
          { id: "list", label: "📋 Door List", badge: "Live" },
          { id: "offer", label: "🏷️ Offers & Deals", badge: dealLive ? "Live" : "Off" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition whitespace-nowrap",
              activeTab === item.id
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-mute hover:border-brand/30 hover:text-ink",
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                activeTab === item.id ? "bg-white/20 text-white" : "bg-paper text-mute border border-line",
              )}
            >
              {item.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
