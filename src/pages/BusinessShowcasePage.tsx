import { useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { ArrowRight, Store } from "lucide-react";
import { handleFromName, randomHexHandle, type BioCatalogItem, type BioCatalogKind } from "@shared/bio";
import { isBusinessCategory } from "@shared/business";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { liveBackendEnabled, upsertBusinessDealRemote } from "@/lib/functions";
import { peekBusinessShowcase, takeBusinessShowcase } from "@/lib/business-showcase";
import { NAMES } from "@shared/names";

const SLOTS: Array<{ kind: BioCatalogKind; label: string; placeholder: string; hint: string }> = [
  { kind: "product", label: "Product", placeholder: "House sourdough", hint: "A thing they can buy" },
  { kind: "service", label: "Service", placeholder: "Weekend brunch booking", hint: "A thing you do for them" },
  { kind: "deal", label: "Offer", placeholder: "Free coffee with any main", hint: "Why they come today" },
];

type SlotDraft = { title: string; detail: string; price: string };

const emptySlot = (): SlotDraft => ({ title: "", detail: "", price: "" });

function itemFromSlot(kind: BioCatalogKind, slot: SlotDraft): BioCatalogItem | null {
  const title = slot.title.trim();
  if (!title) return null;
  return {
    id: nanoid(6),
    kind,
    title,
    detail: slot.detail.trim(),
    price: slot.price.trim() || undefined,
    badge: kind === "deal" ? "Offer" : undefined,
  };
}

export function BusinessShowcasePage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { business, createProfile, updateProfile, handleFree } = useBio();
  const stashed = useMemo(() => peekBusinessShowcase(), []);
  const [slots, setSlots] = useState<SlotDraft[]>(() => SLOTS.map(() => emptySlot()));
  const [busy, setBusy] = useState(false);

  const placeName = stashed?.name || business?.name || "your place";

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next="/business/setup"
        kicker="Your place"
        title="Add 3 things"
        lede="Sign in, then list one product, one service, and one offer so people nearby can find you."
      />
    );
  }

  function setSlot(i: number, patch: Partial<SlotDraft>) {
    setSlots((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function finish(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      const products = itemFromSlot("product", slots[0]!) ? [itemFromSlot("product", slots[0]!)!] : [];
      const services = itemFromSlot("service", slots[1]!) ? [itemFromSlot("service", slots[1]!)!] : [];
      const deals = itemFromSlot("deal", slots[2]!) ? [itemFromSlot("deal", slots[2]!)!] : [];
      let profile = business;
      if (!profile) {
        const fromName = handleFromName(placeName);
        let handle = fromName || randomHexHandle();
        const free = await handleFree(handle);
        if (!free.ok) handle = randomHexHandle();
        profile = await createProfile({
          handle,
          name: placeName,
          city: "Sydney",
          shortWhy: stashed?.shortWhy || "On AirPal",
          kind: "business",
          category: stashed?.category && isBusinessCategory(stashed.category) ? stashed.category : "eat",
          phone: stashed?.phone,
        });
      }
      await updateProfile({
        handle: profile.handle,
        products: products.length ? products : profile.products,
        services: services.length ? services : profile.services,
        deals: deals.length ? deals : profile.deals,
        listingId: stashed?.listingId || profile.listingId,
        placeId: stashed?.placeId || profile.placeId,
        mapsPlaceId: stashed?.mapsPlaceId || profile.mapsPlaceId,
        name: stashed?.name || profile.name,
        shortWhy: stashed?.shortWhy || profile.shortWhy,
        hours: stashed?.hours || profile.hours,
        phone: stashed?.phone || profile.phone,
        cover: stashed?.heroImage || profile.cover,
        avatar: stashed?.logoUrl || profile.avatar,
      });
      if (liveBackendEnabled() && stashed?.listingId && deals[0]) {
        try {
          await upsertBusinessDealRemote({
            listingId: stashed.listingId,
            badge: deals[0].badge || deals[0].title,
            detail: deals[0].detail || deals[0].title,
          });
        } catch {
          /* bio catalog already saved */
        }
      }
      takeBusinessShowcase();
      toast.success(products.length || services.length || deals.length ? "Added" : "You can add these later");
      nav("/business");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">You&apos;re live</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Add 3 things</h1>
      <p className="mt-1 text-sm text-mute">
        One product, one service, one offer for {placeName}. Skip any you don&apos;t have yet.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => void finish(e)}>
        {SLOTS.map((slot, i) => (
          <section key={slot.kind} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
              {i + 1}. {slot.label}
            </p>
            <p className="mt-0.5 text-[12px] text-mute">{slot.hint}</p>
            <input
              value={slots[i]!.title}
              onChange={(e) => setSlot(i, { title: e.target.value })}
              placeholder={slot.placeholder}
              className={`${fieldInput} mt-3`}
            />
            <div className="mt-2 grid grid-cols-[1fr_7rem] gap-2">
              <input
                value={slots[i]!.detail}
                onChange={(e) => setSlot(i, { detail: e.target.value })}
                placeholder="Short line"
                className={fieldInput}
              />
              <input
                value={slots[i]!.price}
                onChange={(e) => setSlot(i, { price: e.target.value })}
                placeholder="Price"
                className={fieldInput}
              />
            </div>
          </section>
        ))}
        <Button type="submit" className="w-full" disabled={busy} loading={busy}>
          Save <ArrowRight size={15} />
        </Button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 text-sm font-medium text-mute"
          disabled={busy}
          onClick={() => {
            takeBusinessShowcase();
            nav("/business");
          }}
        >
          <Store size={14} /> Skip — {NAMES.yourPlace}
        </button>
      </form>
    </div>
  );
}
