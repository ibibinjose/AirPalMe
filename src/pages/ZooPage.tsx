import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { animalById, huntProgress, zooOffers, type ZooHunt } from "@shared/zoo";
import { fetchHunts, loadHunts } from "@/lib/hunts-store";
import { bioPath } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { ZooSticker } from "@/components/zoo/ZooSticker";
import { useAuth } from "@/contexts/AuthContext";
import { useZoo } from "@/contexts/ZooContext";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = ["stickers", "shops", "offers", "hunts"] as const;

export function ZooPage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { state } = useZoo();
  const [tab, setTab] = useState<(typeof TABS)[number]>("stickers");
  const [hunts, setHunts] = useState<ZooHunt[]>(() => loadHunts());
  useEffect(() => {
    let alive = true;
    void fetchHunts().then((rows) => {
      if (alive) setHunts(rows);
    });
    return () => {
      alive = false;
    };
  }, []);
  const hunt = hunts[0];
  const stops = hunt?.stops || [];
  const progress = hunt ? huntProgress(state, hunt.id, hunts) : { have: 0, total: 0, label: "" };
  const offers = zooOffers(state, hunts);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => nav("/me")}
          aria-label="Back to profile"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-line bg-card transition hover:ring-brand/40 active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Air Zoo</p>
      </div>
      <h1 className="font-display mt-1 text-3xl font-semibold">Your Zoo</h1>
      <p className="mt-2 text-sm text-mute">
        {progress.label ||
          (hunt ? `Scan a shop QR on the ${hunt.name}.` : "No hunts published yet — scan a shop QR to begin.")}
        {!user ? " Sign in to keep this Zoo on your account." : ""}
      </p>
      {!user && state.stickers.length > 0 && (
        <Button className="mt-4" onClick={() => nav(`/start?next=${encodeURIComponent("/me/zoo")}`)}>
          Keep my Zoo — join
        </Button>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "h-11 shrink-0 rounded-full px-4 text-sm capitalize transition active:scale-95",
              tab === id ? "bg-brand text-white shadow-xs" : "bg-card ring-1 ring-line",
            )}
          >
            {id === "offers" ? "Offers & deals" : id === "shops" ? "Shops" : id === "hunts" ? "Hunts" : "Stickers"}
          </button>
        ))}
      </div>

      {tab === "stickers" && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {stops.length === 0 && <p className="col-span-3 text-sm text-mute">No hunt stops published yet.</p>}
          {stops.map((stop) => {
            const have = state.stickers.some((s) => s.animalId === stop.animalId);
            return (
              <button key={stop.animalId} type="button" onClick={() => nav(bioPath(stop.handle))} className="text-left">
                <ZooSticker animalId={stop.animalId} locked={!have} className="aspect-square" />
                <p className="mt-1.5 truncate text-[12px] font-medium">{animalById(stop.animalId)?.name}</p>
                <p className="truncate text-[11px] text-mute">{have ? stop.name : "Not yet"}</p>
              </button>
            );
          })}
        </div>
      )}

      {tab === "shops" && (
        <ul className="mt-5 space-y-2">
          {state.shops.length === 0 && <p className="text-sm text-mute">Scan a hunt QR. Shops you visit stay here.</p>}
          {state.shops.map((shop) => (
            <li key={shop.handle}>
              <button
                type="button"
                onClick={() => nav(bioPath(shop.handle))}
                className="flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-line"
              >
                <ZooSticker animalId={shop.animalId} className="h-14 w-14 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{shop.name}</span>
                  <span className="block text-[12px] text-mute">
                    @{shop.handle}
                    {shop.liked ? " · Liked" : ""}
                    {shop.followed ? " · Following" : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "offers" && (
        <ul className="mt-5 space-y-2">
          {offers.length === 0 && <p className="text-sm text-mute">Deals appear after you add a shop sticker.</p>}
          {offers.map((row) => (
            <li key={row.handle} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="text-[12px] text-gold">{row.badge}</p>
              <p className="font-medium">{row.name}</p>
              <p className="mt-1 text-sm text-mute">{row.detail}</p>
              <button
                type="button"
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand"
                onClick={() => nav(bioPath(row.handle))}
              >
                @{row.handle}
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "hunts" &&
        (hunts.length === 0 ? (
          <p className="mt-5 text-sm text-mute">No hunts published yet.</p>
        ) : (
          hunts.map((h) => {
            const hp = huntProgress(state, h.id, hunts);
            return (
              <div key={h.id} className="mt-5 rounded-3xl bg-card px-5 py-5 ring-1 ring-line">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gold">{h.city}</p>
                <h2 className="font-display mt-1 text-2xl">{h.name}</h2>
                <p className="mt-2 text-sm text-mute">{hp.label}. Scan the shop QR, then add the animal to your Zoo.</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                  <div className="h-full bg-brand" style={{ width: `${hp.total ? (hp.have / hp.total) * 100 : 0}%` }} />
                </div>
                <Button className="mt-4" variant="ghost" onClick={() => nav("/scan")}>
                  Scan a shop
                </Button>
              </div>
            );
          })
        ))}
    </div>
  );
}
