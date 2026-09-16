import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Clock, MapPin, Trash2 } from "lucide-react";
import { BIO_LINK_TYPES, bioPath, catalogDeals, handleError, isSocialLinkType, normalizeHandle, type BioCatalogItem, type BioCatalogKind, type BioLink, type BioLinkType } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { BioCatalogEditor } from "@/components/bio/BioCatalogEditor";
import { useBio } from "@/contexts/BioContext";
import { ImageField } from "@/components/media/ImageField";
import { makeQrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/cn";
import { PhoneField } from "@/components/forms/PhoneField";
import { isValidPhone } from "@shared/geo-address";

const SOCIAL_CONFIG: Partial<
  Record<
    BioLinkType,
    {
      prefix: string;
      cleanPrefix: string;
      placeholder: string;
      example: string;
      domainRegex: RegExp;
    }
  >
> = {
  instagram: {
    prefix: "https://instagram.com/",
    cleanPrefix: "instagram.com/",
    placeholder: "username",
    example: "e.g. cafe_sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:@)?/i,
  },
  facebook: {
    prefix: "https://facebook.com/",
    cleanPrefix: "facebook.com/",
    placeholder: "page or username",
    example: "e.g. cafe.sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
  },
  tiktok: {
    prefix: "https://tiktok.com/@",
    cleanPrefix: "tiktok.com/@",
    placeholder: "username",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(?:@)?/i,
  },
  x: {
    prefix: "https://x.com/",
    cleanPrefix: "x.com/",
    placeholder: "username",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:@)?/i,
  },
  youtube: {
    prefix: "https://youtube.com/@",
    cleanPrefix: "youtube.com/@",
    placeholder: "channel name",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)?/i,
  },
  linkedin: {
    prefix: "https://linkedin.com/in/",
    cleanPrefix: "linkedin.com/in/",
    placeholder: "profile or company ID",
    example: "e.g. alex-morgan",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in\/|company\/)?/i,
  },
  threads: {
    prefix: "https://threads.net/@",
    cleanPrefix: "threads.net/@",
    placeholder: "username",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?threads\.net\/(?:@)?/i,
  },
  snapchat: {
    prefix: "https://snapchat.com/add/",
    cleanPrefix: "snapchat.com/add/",
    placeholder: "username",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?snapchat\.com\/(?:add\/)?/i,
  },
  pinterest: {
    prefix: "https://pinterest.com/",
    cleanPrefix: "pinterest.com/",
    placeholder: "username",
    example: "e.g. cafesydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?pinterest\.com\//i,
  },
  whatsapp: {
    prefix: "https://wa.me/",
    cleanPrefix: "wa.me/",
    placeholder: "phone number with country code",
    example: "e.g. 61400123456",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)/i,
  },
};

function formatFinalLinkHref(type: BioLinkType, input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  const social = SOCIAL_CONFIG[type];
  if (social) {
    let handle = raw.replace(social.domainRegex, "").replace(/^@/, "").trim();
    handle = handle.replace(/\/+$/, "");
    return `${social.prefix}${handle}`;
  }

  if (type === "call") {
    if (raw.startsWith("tel:")) return raw;
    return `tel:${raw.replace(/\s+/g, "")}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}

export function BioEditPage() {
  const [, nav] = useLocation();
  const { mine, business, updateProfile, tapsToday, transferHandle } = useBio();
  const [tab, setTab] = useState<"profile" | "links" | "shop" | "share">("profile");
  const [name, setName] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");

  const [mapsPlaceId, setMapsPlaceId] = useState("");
  const [nextHandle, setNextHandle] = useState("");
  const [links, setLinks] = useState<BioLink[]>([]);
  const [products, setProducts] = useState<BioCatalogItem[]>([]);
  const [services, setServices] = useState<BioCatalogItem[]>([]);
  const [deals, setDeals] = useState<BioCatalogItem[]>([]);
  const [qr, setQr] = useState("");
  const [type, setType] = useState<BioLinkType>("website");
  const [href, setHref] = useState("");
  const [zooHunt, setZooHunt] = useState(false);

  useEffect(() => {
    if (!mine) return;
    setName(mine.name);
    setShortWhy(mine.shortWhy);
    setCity(mine.city);
    setHours(mine.hours);
    setOpenNow(mine.openNow);
    setPhone(mine.phone || "");
    setAvatar(mine.avatar || "");
    setCover(mine.cover || "");
    setMapsPlaceId(mine.mapsPlaceId || "");
    setLinks(mine.links);
    setProducts(mine.products || []);
    setServices(mine.services || []);
    setDeals(mine.deals?.length ? mine.deals : catalogDeals(mine));
    setZooHunt(Boolean(business?.zooHunt ?? mine.zooHunt));
    const origin = window.location.origin;
    void makeQrDataUrl(`${origin}${bioPath(mine.handle)}`).then(setQr);
  }, [business, mine]);

  if (!mine) {
    return (
      <div className="grid min-h-[40vh] place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl">No @ yet</p>
          <Button className="mt-4" onClick={() => nav("/bio/setup")}>
            Setup
          </Button>
        </div>
      </div>
    );
  }

  const share = `${typeof window !== "undefined" ? window.location.origin : "https://airpal.me"}${bioPath(mine.handle)}`;

  async function onProfile(e: FormEvent) {
    e.preventDefault();
    if (phone && !isValidPhone(phone)) {
      toast.error("Phone needs a country code");
      return;
    }
    await updateProfile({
      handle: mine!.handle,
      name,
      shortWhy,
      city,
      hours,
      openNow,
      phone,
      avatar: avatar.trim() || undefined,
      cover: cover.trim() || undefined,
      mapsPlaceId: mapsPlaceId.trim() || undefined,
      zooHunt,
    });
    if (business && business.handle !== mine!.handle) {
      await updateProfile({ handle: business.handle, zooHunt });
    }
    toast.success("Saved");
  }

  async function onStoredPhoto(kind: "avatar" | "cover", src?: string) {
    if (!mine) return;
    if (kind === "avatar") setAvatar(src || "");
    else setCover(src || "");
    await updateProfile({ handle: mine.handle, [kind]: src || "" });
  }

  async function saveCatalog(kind: BioCatalogKind, rows: BioCatalogItem[]) {
    const nextProducts = kind === "product" ? rows : products;
    const nextServices = kind === "service" ? rows : services;
    const nextDeals = kind === "deal" ? rows : deals;
    if (kind === "product") setProducts(rows);
    if (kind === "service") setServices(rows);
    if (kind === "deal") setDeals(rows);
    await updateProfile({ handle: mine!.handle, products: nextProducts, services: nextServices, deals: nextDeals });
    toast.success("Saved");
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">@{mine.handle}</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{mine.kind === "business" ? "Edit business" : "Edit bio"}</h1>
      {mine.kind !== "business" && (
        <button type="button" className="mt-2 text-sm text-brand" onClick={() => nav(business ? "/business" : "/bio/setup?kind=business")}>
          {business ? `@${business.handle}` : "Host a registered business"}
        </button>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["profile", "links", "shop", "share"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("h-9 rounded-full px-4 text-sm capitalize", tab === id ? "bg-ink text-white" : "bg-white ring-1 ring-line")}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <form className="mt-5 space-y-4" onSubmit={onProfile}>
          <ImageField kind="cover" value={cover} onChange={(src) => void onStoredPhoto("cover", src)} />
          <ImageField kind="avatar" round value={avatar} onChange={(src) => void onStoredPhoto("avatar", src)} />

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harbour Brew Cafe or Alex Morgan"
              className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink"
            />
            <p className="text-[11px] text-mute">The primary name shown on your public profile card.</p>
          </div>

          {/* Tagline / Short Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">
              Tagline / Short Bio
            </label>
            <input
              value={shortWhy}
              onChange={(e) => setShortWhy(e.target.value)}
              placeholder="e.g. Specialty coffee, artisanal roasts & harbour views"
              className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink"
            />
            <p className="text-[11px] text-mute">A short 1-line description displayed right below your name.</p>
          </div>

          {/* City / Location */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-mute">
              <MapPin size={13} className="text-gold" />
              <span>City / Suburb & Region</span>
            </div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Sydney, NSW or Bondi Beach, NSW"
              className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink"
            />
            <p className="text-[11px] text-mute">
              Where you or your business is based. Used to group your bio with local precinct recommendations.
            </p>
          </div>

          {/* Trading / Opening Hours */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-mute">
              <Clock size={13} className="text-gold" />
              <span>Trading / Opening Hours</span>
            </div>
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. Mon–Fri 7:00 AM – 4:00 PM, Sat 8:00 AM – 2:00 PM"
              className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink"
            />
            <p className="text-[11px] text-mute">
              Your opening schedule displayed at the top of your profile. For 24/7 access, write "Open 24/7".
            </p>
          </div>

          {/* Live Visitor Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">
              Live Visitor Status
            </label>
            <button
              type="button"
              onClick={() => setOpenNow((v) => !v)}
              className={cn(
                "flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-medium ring-1 transition",
                openNow
                  ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
                  : "bg-card text-mute ring-line"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", openNow ? "animate-pulse bg-emerald-500" : "bg-mute/40")} />
                <span>{openNow ? "Currently Open to Visitors" : "Currently Closed"}</span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
                  openNow ? "bg-emerald-200/70 text-emerald-900" : "bg-line text-mute"
                )}
              >
                {openNow ? "Open" : "Closed"}
              </span>
            </button>
            <p className="text-[11px] text-mute">Toggle anytime to let visitors know if you are open right now.</p>
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">
              Contact Phone (Optional)
            </label>
            <PhoneField value={phone} onChange={setPhone} />
            <p className="text-[11px] text-mute">Include country code (e.g. +61 400 123 456) for direct WhatsApp or calls.</p>
          </div>

          {/* Google Maps Place ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">
              Google Maps Place ID (Optional)
            </label>
            <input
              value={mapsPlaceId}
              onChange={(e) => setMapsPlaceId(e.target.value)}
              placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
              className="h-12 w-full rounded-2xl bg-card px-4 font-mono text-xs ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink"
            />
            <p className="text-[11px] text-mute">
              Directly links your bio to your Google Place reviews, navigation, and photos.
            </p>
          </div>

          <Button type="submit" className="mt-4 h-12 w-full text-base font-semibold shadow-md">
            Save Profile
          </Button>
        </form>
      )}

      {tab === "links" && (() => {
        const social = SOCIAL_CONFIG[type];
        const selectedLabel = BIO_LINK_TYPES.find((t) => t.id === type)?.label || type;
        return (
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BIO_LINK_TYPES.filter((t) => !isSocialLinkType(t.id)).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      setHref("");
                    }}
                    className={cn(
                      "h-9 rounded-full px-3 text-sm font-medium transition",
                      type === t.id ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:border-ink/40"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Social Media</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BIO_LINK_TYPES.filter((t) => isSocialLinkType(t.id)).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      setHref("");
                    }}
                    className={cn(
                      "h-9 rounded-full px-3.5 text-sm font-medium transition",
                      type === t.id ? "bg-brand text-white shadow-sm" : "bg-white ring-1 ring-line hover:border-ink/40"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form with Prefilled URL */}
            <form
              className="space-y-1.5 rounded-2xl border border-line bg-card p-3.5 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!href.trim()) return;
                const finalHref = formatFinalLinkHref(type, href);
                if (!finalHref) return;
                const next = [
                  ...links,
                  {
                    id: nanoid(6),
                    type,
                    label: selectedLabel,
                    href: finalHref,
                  },
                ];
                setLinks(next);
                setHref("");
                void updateProfile({ handle: mine.handle, links: next });
                toast.success(`Added ${selectedLabel}`);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Add {selectedLabel}
                </span>
                {social && <span className="text-[11px] text-mute">{social.example}</span>}
              </div>

              <div className="flex items-center overflow-hidden rounded-xl bg-paper ring-1 ring-line transition focus-within:ring-2 focus-within:ring-ink">
                {social ? (
                  <span className="flex h-11 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3 font-mono text-xs font-medium text-mute">
                    {social.cleanPrefix}
                  </span>
                ) : type === "call" ? (
                  <span className="flex h-11 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3 font-mono text-xs font-medium text-mute">
                    tel:
                  </span>
                ) : null}

                <input
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder={
                    social
                      ? social.placeholder
                      : type === "call"
                      ? "+61 400 123 456"
                      : "https://yourwebsite.com"
                  }
                  className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-mute/60"
                />

                <Button type="submit" size="sm" className="m-1 h-9 shrink-0 px-4 font-medium">
                  Add
                </Button>
              </div>

              <p className="text-[11px] text-mute">
                {social
                  ? "Enter your handle only. We automatically format the complete profile URL."
                  : type === "call"
                  ? "Enter your phone number with international country code."
                  : "Enter the complete destination web address."}
              </p>
            </form>

            {/* Active Links List */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                Your Added Links ({links.length})
              </p>
              {links.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-mute">
                  No links added yet. Select a social platform or action above to add one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line shadow-sm"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                            {l.type}
                          </span>
                          <span className="text-sm font-medium text-ink">{l.label}</span>
                        </div>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block truncate text-xs text-brand hover:underline"
                        >
                          {l.href}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="rounded-full p-2 text-mute transition hover:bg-rose-50 hover:text-rose-600"
                        title="Remove link"
                        onClick={() => {
                          const next = links.filter((x) => x.id !== l.id);
                          setLinks(next);
                          void updateProfile({ handle: mine.handle, links: next });
                          toast.success("Link removed");
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })()}

      {tab === "shop" && (
        <BioCatalogEditor products={products} services={services} deals={deals} onChange={saveCatalog} />
      )}

      {tab === "share" && (
        <div className="mt-5 space-y-4 text-center">
          {qr && <img src={qr} alt="" className="mx-auto h-52 w-52" />}
          <p className="font-medium">airpal.me/@{mine.handle}</p>
          <p className="text-sm text-mute">{tapsToday(mine.handle)} taps today</p>
          <label className="mt-2 flex items-center justify-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={zooHunt}
              onChange={(e) => setZooHunt(e.target.checked)}
            />
            Air Zoo hunt — sticker on this QR
          </label>
          <p className="text-[12px] text-mute">Print this QR. Guests scan, see the shop, then collect an Australian animal.</p>
          <Button
            className="w-full"
            onClick={() => {
              void navigator.clipboard.writeText(share);
              toast.success("Copied");
            }}
          >
            Copy URL
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => nav(bioPath(mine.handle))}>
            View
          </Button>
          <form
            className="space-y-2 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              const err = handleError(nextHandle);
              if (err) {
                toast.error(err);
                return;
              }
              void transferHandle(mine.handle, nextHandle)
                .then((h) => {
                  toast.success(`@${h}`);
                  setNextHandle("");
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Move handle</p>
            <input
              value={nextHandle}
              onChange={(e) => setNextHandle(normalizeHandle(e.target.value))}
              placeholder="newhandle"
              className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none"
            />
            <Button type="submit" variant="ghost" className="w-full" disabled={!nextHandle}>
              Transfer
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
