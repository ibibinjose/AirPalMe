import { useListings } from "@/contexts/ListingsContext";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { useLocation } from "wouter";

export function PartnersPage() {
  const { listings } = useListings();
  const [, nav] = useLocation();
  const active = listings.filter((l) => l.status === "active");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <header className="flex items-end justify-between gap-3 py-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Partners</p>
          <h1 className="font-display text-3xl font-semibold">Places & Venues</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => nav("/partner")}>
            Talk to Partnerships
          </Button>
          <Button size="sm" onClick={() => nav("/business/onboard")}>
            Onboard Your Business
          </Button>
        </div>
      </header>
      {active.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-10 text-center">
          <p className="font-display text-lg font-medium">No partner venues listed yet</p>
          <p className="mt-1 text-sm text-mute">Be the first local venue or stall to list on AirPal.</p>
          <Button size="sm" className="mt-4" onClick={() => nav("/business/onboard")}>
            List Your Business
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {active.map((v) => (
            <article key={v.id} className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
              {v.heroImage && <Photo src={v.heroImage} className="h-32 w-full object-cover" />}
              <div className="p-3">
                <p className="font-medium leading-tight">{v.name}</p>
                <p className="text-[12px] text-mute">{v.category}</p>
                {v.address && <p className="mt-1 truncate text-[11px] text-mute">{v.address}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
