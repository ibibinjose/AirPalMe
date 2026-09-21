import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  QrCode,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  AVAILABILITY_STATUSES,
  BIO_LINK_TYPES,
  bioPath,
  catalogDeals,
  handleError,
  isBusinessKind,
  isSocialLinkType,
  normalizeHandle,
  type AvailabilityStatus,
  type BioCatalogItem,
  type BioCatalogKind,
  type BioLink,
  type BioLinkType,
} from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { BioCatalogEditor } from "@/components/bio/BioCatalogEditor";
import { useBio } from "@/contexts/BioContext";
import { ImageField } from "@/components/media/ImageField";
import { makeQrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/cn";
import { PhoneField } from "@/components/forms/PhoneField";
import { isValidPhone } from "@shared/geo-address";
import { fieldInput } from "@/components/forms/ValidField";
import { GooglePlaceImportCard, PersonalProfileListingHint } from "@/components/business/GooglePlaceImport";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { Photo } from "@/components/ui/Photo";
import { BioHandleButton } from "@/components/bio/BioHandleButton";

const CATEGORY_TAG_PRESETS = [
  { id: "Creator", label: "Creator 🎨" },
  { id: "AirPal Mate", label: "AirPal Mate 🤝" },
  { id: "Local Business", label: "Local Business 🏪" },
  { id: "Food & Drink", label: "Food & Drink ☕" },
  { id: "Stay Host", label: "Stay Host 🏡" },
  { id: "Fashion & Style", label: "Fashion & Style 👗" },
  { id: "Community", label: "Community 🌟" },
  { id: "Music & Events", label: "Music & Events 🎵" },
] as const;

const PRIMARY_CTA_PRESETS = [
  "Catch Up",
  "Book Mate",
  "Order Online",
  "Message WhatsApp",
  "View Menu",
  "Contact Me",
] as const;

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

  // Editable Profile Form States
  const [name, setName] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [languages, setLanguages] = useState("");
  const [primaryCta, setPrimaryCta] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("available");
  const [customStatus, setCustomStatus] = useState("");
  const [customStatusEmoji, setCustomStatusEmoji] = useState("☕");
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

  // Mobile Live Preview Modal Sheet State
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!mine) return;
    setName(mine.name);
    setShortWhy(mine.shortWhy || "");
    setAboutText(mine.aboutText || "");
    setCategoryTag(mine.categoryTag || (mine.kind === "business" ? "Local Business" : "AirPal Mate"));
    setPronouns(mine.pronouns || "");
    setLanguages(mine.languages || "");
    setPrimaryCta(mine.primaryCta || "Catch Up");
    setCity(mine.city || "");
    setHours(mine.hours || "");
    setOpenNow(mine.openNow ?? true);
    setAvailabilityStatus(mine.availabilityStatus || "available");
    setCustomStatus(mine.customStatus || "");
    setCustomStatusEmoji(mine.customStatusEmoji || "☕");
    setPhone(mine.phone || "");
    setAvatar(mine.avatar || "");
    setCover(mine.cover || "");
    setMapsPlaceId(mine.mapsPlaceId || "");
    setLinks(mine.links || []);
    setProducts(mine.products || []);
    setServices(mine.services || []);
    setDeals(mine.deals?.length ? mine.deals : catalogDeals(mine));
    setZooHunt(Boolean(business?.zooHunt ?? mine.zooHunt));
    const origin = window.location.origin;
    void makeQrDataUrl(`${origin}${bioPath(mine.handle)}`).then(setQr);
  }, [business, mine]);

  if (!mine) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-6 text-center">
        <div className="rounded-3xl bg-card p-8 shadow-sm ring-1 ring-line max-w-sm w-full">
          <p className="font-display text-2xl font-bold text-ink">No @ handle yet</p>
          <p className="mt-2 text-sm text-mute">Set up your AirPal profile or business handle to get started.</p>
          <Button className="mt-5 w-full h-11 text-base font-semibold shadow-md" onClick={() => nav("/bio/setup")}>
            Set Up Handle
          </Button>
        </div>
      </div>
    );
  }

  const share = `${typeof window !== "undefined" ? window.location.origin : "https://airpal.me"}${bioPath(mine.handle)}`;

  async function onProfile(e: FormEvent) {
    e.preventDefault();
    if (phone && !isValidPhone(phone)) {
      toast.error("Phone needs a country code (e.g. +61 400 123 456)");
      return;
    }
    try {
      await updateProfile({
        handle: mine!.handle,
        name,
        shortWhy,
        aboutText,
        categoryTag,
        pronouns,
        languages,
        primaryCta,
        city,
        hours,
        openNow,
        availabilityStatus,
        customStatus: customStatus.trim() || undefined,
        customStatusEmoji: customStatusEmoji.trim() || undefined,
        phone,
        avatar: avatar.trim() || undefined,
        cover: cover.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        zooHunt,
        links,
        products,
        services,
        deals,
      });
      if (business && business.handle !== mine!.handle) {
        await updateProfile({ handle: business.handle, zooHunt });
      }
      toast.success("Saved to your AirPal account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save to your account. Try again.");
    }
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
    toast.success("Catalog saved");
  }

  const statusInfo = AVAILABILITY_STATUSES[availabilityStatus] || AVAILABILITY_STATUSES.available;

  // Render the Live Interactive Profile Preview Card
  const renderLivePreviewCard = () => (
    <div className="overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-line/80">
      {/* Cover Header */}
      <div className="relative">
        {cover ? (
          <Photo src={cover} className="h-40 w-full object-cover sm:h-44" />
        ) : (
          <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[#1b221d] via-[#222b24] to-[#121614] sm:h-44">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>
        )}

        {/* Live Badge Top Right */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE PREVIEW
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="px-5 pb-6">
        <div className="flex items-end justify-between">
          <div className="relative">
            <div
              className={cn(
                "-mt-12 relative z-10 h-24 w-24 overflow-hidden rounded-full bg-paper ring-4 shadow-md transition-all",
                statusInfo.ringClass,
              )}
            >
              {avatar ? (
                <Photo src={avatar} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-ink font-display text-2xl font-bold text-white">
                  {(name || "A")[0]}
                </span>
              )}
            </div>
          </div>

          <div className="mb-1">
            <BioHandleButton handle={mine.handle} />
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 text-left">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{name || "Your Name"}</h2>
            {categoryTag && (
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                {categoryTag}
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-mute mt-0.5">
            @{mine.handle}
            {pronouns && ` · ${pronouns}`}
          </p>

          {/* Status Badge */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                statusInfo.badgeBg,
                statusInfo.textColor,
              )}
            >
              <span>{statusInfo.label}</span>
              {customStatus && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="font-normal text-ink/90 truncate max-w-[180px]">
                    {customStatusEmoji} {customStatus}
                  </span>
                </>
              )}
            </span>
            {hours && <span className="text-[11px] text-mute font-medium">· {hours}</span>}
          </div>

          {/* Location & Languages */}
          {(city || languages) && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs text-mute font-medium">
              {city && (
                <>
                  <MapPin size={12} className="text-gold shrink-0" />
                  <span>{city}</span>
                </>
              )}
              {city && languages && <span>·</span>}
              {languages && <span>Languages: {languages}</span>}
            </p>
          )}

          {/* Tagline */}
          {shortWhy && <p className="mt-2 text-xs leading-relaxed text-ink/85 font-normal">{shortWhy}</p>}

          {/* Extended Bio */}
          {aboutText && (
            <div className="mt-3 rounded-2xl bg-paper p-3 text-xs leading-relaxed text-ink/80 border border-line/60">
              <p className="font-semibold text-[10px] uppercase tracking-wider text-mute mb-1">About</p>
              <p className="whitespace-pre-line">{aboutText}</p>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="mt-4">
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-brand-ink active:scale-[0.98]"
          >
            <HeartHandshake size={15} />
            <span>{primaryCta || "Catch Up"}</span>
          </button>
        </div>

        {/* Quick Action Row */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <div className="flex h-9 items-center justify-center gap-1 rounded-full bg-card border border-line text-[11px] font-medium text-ink">
            <Globe size={12} className="text-sky-600" />
            <span>Website</span>
          </div>
          <div className="flex h-9 items-center justify-center gap-1 rounded-full bg-card border border-line text-[11px] font-medium text-ink">
            <MessageCircle size={12} className="text-emerald-600" />
            <span>WhatsApp</span>
          </div>
          <div className="flex h-9 items-center justify-center gap-1 rounded-full bg-card border border-line text-[11px] font-medium text-ink">
            <Phone size={12} className="text-amber-600" />
            <span>Call</span>
          </div>
        </div>

        {/* Catalog / Deals Highlights */}
        {deals.length > 0 && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-paper to-card p-3 border border-gold/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                <Sparkles size={11} /> Featured Deal
              </span>
              <span className="text-[10px] text-mute">{deals[0].badge || "Offer"}</span>
            </div>
            <p className="mt-1 font-semibold text-xs text-ink">{deals[0].title}</p>
            {deals[0].detail && <p className="text-[11px] text-mute">{deals[0].detail}</p>}
          </div>
        )}

        {/* Links stack */}
        {links.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Links ({links.length})</p>
            {links.slice(0, 3).map((l) => (
              <div
                key={l.id}
                className="flex h-10 items-center justify-between rounded-xl bg-paper px-3 text-xs font-medium text-ink border border-line/60"
              >
                <span className="truncate">{l.label}</span>
                <ExternalLink size={12} className="text-mute shrink-0" />
              </div>
            ))}
            {links.length > 3 && (
              <p className="text-[10px] text-center text-mute font-medium">+ {links.length - 3} more links</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24 pb-safe pt-4">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nav(bioPath(mine.handle))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card border border-line text-ink transition hover:bg-paper active:scale-95 shadow-xs"
            aria-label="Back to public bio"
            title="Back to public bio"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">@{mine.handle}</p>
              <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase text-mute border border-line">
                {mine.kind === "business" ? "Business Profile" : "Personal Profile"}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {mine.kind === "business" ? "Edit Business Profile" : "Edit AirPal Bio"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Public Profile Link */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full border border-line bg-card px-4 font-semibold text-ink shadow-xs hover:bg-paper"
            onClick={() => nav(bioPath(mine.handle))}
          >
            <ExternalLink size={14} className="text-brand" />
            <span>View Public Profile</span>
          </Button>

          {/* Mobile Live Preview Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden gap-1.5 rounded-full bg-brand text-white font-semibold shadow-sm hover:bg-brand-ink"
            onClick={() => setMobilePreviewOpen(true)}
          >
            <Eye size={14} />
            <span>Preview</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Editor Column (7 cols on desktop) + Right Live Preview (5 cols on desktop) */}
      <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Segmented Tabs & Editors */}
        <div className="lg:col-span-7">
          {/* Segmented Control Navigation Bar */}
          <div className="flex rounded-2xl bg-paper p-1.5 ring-1 ring-line shadow-xs">
            {(
              [
                { id: "profile", label: "Profile", icon: Edit3 },
                { id: "links", label: "Links", icon: Globe },
                { id: "shop", label: "Shop", icon: Package },
                { id: "share", label: "Share & QR", icon: QrCode },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 h-10 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95",
                  tab === item.id
                    ? "bg-brand text-white shadow-sm"
                    : "text-mute hover:text-ink hover:bg-white/50",
                )}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: PROFILE EDITOR */}
          {tab === "profile" && (
            <form className="mt-6 space-y-6" onSubmit={onProfile}>
              {/* Media Section: Cover & Avatar */}
              <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Media & Images</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-ink mb-1 block">Cover Header Photo</label>
                    <ImageField kind="cover" value={cover} onChange={(src) => void onStoredPhoto("cover", src)} />
                    <p className="mt-1 text-[11px] text-mute">Recommended ratio: 16:9 banner photo for top header.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink mb-1 block">Profile Avatar Photo</label>
                    <ImageField kind="avatar" round value={avatar} onChange={(src) => void onStoredPhoto("avatar", src)} />
                    <p className="mt-1 text-[11px] text-mute">Square or portrait face/logo photo.</p>
                  </div>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Basic Profile Info</p>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute">Display Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Harbour Brew Cafe or Alex Morgan"
                    required
                    className={fieldInput}
                  />
                  <p className="text-[11px] text-mute">The primary name shown on your public profile card.</p>
                </div>

                {/* Category / Vibe Badge Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute">Profile Category / Vibe</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CATEGORY_TAG_PRESETS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryTag(cat.id)}
                        className={cn(
                          "h-8 rounded-full px-3 text-xs font-medium transition active:scale-95",
                          categoryTag === cat.id
                            ? "bg-brand text-white shadow-xs"
                            : "bg-paper border border-line text-ink hover:border-brand/40",
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tagline / Short Bio */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">Tagline (1 Line)</label>
                    <span className="text-[10px] text-mute">{shortWhy.length}/100</span>
                  </div>
                  <input
                    value={shortWhy}
                    maxLength={100}
                    onChange={(e) => setShortWhy(e.target.value)}
                    placeholder="e.g. Specialty coffee, artisanal roasts & harbour views"
                    className={fieldInput}
                  />
                  <p className="text-[11px] text-mute">A short 1-line description displayed right below your name.</p>
                </div>

                {/* Extended Bio / About Story */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">About Story / Extended Bio</label>
                    <span className="text-[10px] text-mute">{aboutText.length}/280</span>
                  </div>
                  <textarea
                    value={aboutText}
                    maxLength={280}
                    rows={3}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Share a longer description about who you are, your background, services offered, or what makes your spot unique..."
                    className="w-full rounded-2xl border border-line bg-paper p-3 text-sm outline-none transition focus:border-ink placeholder:text-mute/60 resize-none"
                  />
                </div>
              </div>

              {/* Personalization & Mate Details */}
              <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Connections & Preferences</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pronouns */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">Pronouns (Optional)</label>
                    <input
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g. She/Her, They/Them"
                      className={fieldInput}
                    />
                  </div>

                  {/* Languages Spoken */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">Languages Spoken</label>
                    <input
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="e.g. English, Spanish, Japanese"
                      className={fieldInput}
                    />
                  </div>
                </div>

                {/* Primary Action Button Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute">Primary Action Button</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRIMARY_CTA_PRESETS.map((cta) => (
                      <button
                        key={cta}
                        type="button"
                        onClick={() => setPrimaryCta(cta)}
                        className={cn(
                          "h-8 rounded-full px-3 text-xs font-medium transition active:scale-95",
                          primaryCta === cta
                            ? "bg-brand text-white shadow-xs"
                            : "bg-paper border border-line text-ink hover:border-brand/40",
                        )}
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-mute">Customizes the main action button on your public card.</p>
                </div>
              </div>

              {/* Location & Schedule Section */}
              <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Location & Hours</p>

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
                    className={fieldInput}
                  />
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
                    className={fieldInput}
                  />
                </div>

                {/* Live Availability Status Picker */}
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute">Live Availability & WhatsApp Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(AVAILABILITY_STATUSES) as AvailabilityStatus[]).map((stKey) => {
                      const st = AVAILABILITY_STATUSES[stKey];
                      return (
                        <button
                          key={stKey}
                          type="button"
                          onClick={() => {
                            setAvailabilityStatus(stKey);
                            setOpenNow(stKey === "available");
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-2xl p-2.5 text-left border text-xs font-semibold transition active:scale-95",
                            availabilityStatus === stKey
                              ? "bg-brand/10 border-brand text-brand shadow-xs"
                              : "bg-paper border-line text-ink hover:bg-card",
                          )}
                        >
                          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", st.dotColor)} />
                          <span className="truncate">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Status Text & Emoji */}
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <input
                      value={customStatusEmoji}
                      onChange={(e) => setCustomStatusEmoji(e.target.value)}
                      placeholder="☕"
                      maxLength={4}
                      className="h-11 rounded-2xl border border-line bg-paper text-center text-base outline-none focus:border-ink"
                    />
                    <input
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      placeholder="e.g. Coffee at Rocks Cafe"
                      className={`col-span-3 ${fieldInput}`}
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5 pt-2 border-t border-line/60">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute">Contact Phone (Optional)</label>
                  <PhoneField value={phone} onChange={setPhone} />
                  <p className="text-[11px] text-mute">Include country code for direct WhatsApp & calling.</p>
                </div>
              </div>

              {isBusinessKind(mine.kind) ? (
                <GooglePlaceImportCard
                  importedPlaceId={mapsPlaceId}
                  onImport={(place) => {
                    setName(place.name);
                    setCity(place.city || city);
                    setHours(place.hours || hours);
                    setPhone(place.phone || phone);
                    setMapsPlaceId(place.placeId);
                    if (place.photoNames[0]) setCover(place.photoNames[0]);
                    if (place.photoNames[1] || place.photoNames[0])
                      setAvatar(place.photoNames[1] || place.photoNames[0] || "");
                    if (place.shortWhy && shortWhy.length < 10) setShortWhy(place.shortWhy);
                    setLinks((prev) => mergeBioLinks(prev, bioLinksFromGooglePlace(place)));
                    toast.success("Imported from Google — save to keep changes");
                  }}
                />
              ) : (
                <PersonalProfileListingHint
                  hasBusiness={Boolean(business)}
                  onOpenBusiness={() => nav(business ? "/business" : "/business/onboard")}
                />
              )}

              <Button type="submit" className="h-12 w-full text-base font-semibold shadow-md gap-2">
                <Check size={18} />
                Save All Profile Changes
              </Button>
            </form>
          )}

          {/* TAB 2: LINKS & SOCIAL MEDIA */}
          {tab === "links" &&
            (() => {
              const social = SOCIAL_CONFIG[type];
              const selectedLabel = BIO_LINK_TYPES.find((t) => t.id === type)?.label || type;
              return (
                <div className="mt-6 space-y-6">
                  {/* Category Buttons */}
                  <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Actions & Preset Links</p>
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
                              "h-9 rounded-full px-3.5 text-xs font-semibold transition active:scale-95",
                              type === t.id ? "bg-brand text-white shadow-xs" : "bg-paper border border-line text-ink hover:bg-card",
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Social Media Networks</p>
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
                              "h-9 rounded-full px-3.5 text-xs font-semibold transition active:scale-95",
                              type === t.id ? "bg-brand text-white shadow-xs" : "bg-paper border border-line text-ink hover:bg-card",
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Link Input Box */}
                  <form
                    className="space-y-3 rounded-3xl border border-line bg-card p-5 shadow-xs"
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
                      void updateProfile({ handle: mine.handle, links: next })
                        .then(() => toast.success(`Added ${selectedLabel}`))
                        .catch((err) =>
                          toast.error(err instanceof Error ? err.message : "Could not save that link to your account"),
                        );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-mute">Add {selectedLabel} Link</span>
                      {social && <span className="text-[11px] text-mute">{social.example}</span>}
                    </div>

                    <div className="flex items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition focus-within:ring-2 focus-within:ring-ink">
                      {social ? (
                        <span className="flex h-12 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3.5 font-mono text-xs font-medium text-mute">
                          {social.cleanPrefix}
                        </span>
                      ) : type === "call" ? (
                        <span className="flex h-12 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3.5 font-mono text-xs font-medium text-mute">
                          tel:
                        </span>
                      ) : null}

                      <input
                        value={href}
                        onChange={(e) => setHref(e.target.value)}
                        placeholder={
                          social ? social.placeholder : type === "call" ? "+61 400 123 456" : "https://yourwebsite.com"
                        }
                        className="h-12 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-mute/60"
                      />

                      <Button type="submit" size="sm" className="m-1.5 h-9 shrink-0 px-4 font-semibold">
                        Add Link
                      </Button>
                    </div>

                    <p className="text-[11px] text-mute">
                      {social
                        ? "Enter handle only. AirPal formats the complete profile URL automatically."
                        : type === "call"
                          ? "Enter your phone number with country code."
                          : "Enter destination web address URL."}
                    </p>
                  </form>

                  {/* Active Links List */}
                  <div className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Active Bio Links ({links.length})
                    </p>
                    {links.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-line p-5 text-center text-xs text-mute">
                        No links added yet. Pick a network or action above to add one.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {links.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 border border-line/70 shadow-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute border border-line">
                                  {l.type}
                                </span>
                                <span className="text-sm font-semibold text-ink">{l.label}</span>
                              </div>
                              <a
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-0.5 block truncate text-xs font-medium text-brand hover:underline"
                              >
                                {l.href}
                              </a>
                            </div>
                            <button
                              type="button"
                              className="rounded-full p-2 text-mute transition hover:bg-rose-50 hover:text-rose-600 shrink-0"
                              title="Remove link"
                              onClick={() => {
                                const next = links.filter((x) => x.id !== l.id);
                                setLinks(next);
                                void updateProfile({ handle: mine.handle, links: next })
                                  .then(() => toast.success("Link removed"))
                                  .catch((err) =>
                                    toast.error(err instanceof Error ? err.message : "Could not update your account"),
                                  );
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* TAB 3: SHOP / CATALOG */}
          {tab === "shop" && (
            <div className="rounded-3xl border border-line bg-card p-5 shadow-xs">
              <BioCatalogEditor products={products} services={services} deals={deals} onChange={saveCatalog} />
            </div>
          )}

          {/* TAB 4: SHARE & QR */}
          {tab === "share" && (
            <div className="mt-6 space-y-6">
              <div className="rounded-3xl border border-line bg-card p-6 text-center shadow-xs space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Your Profile QR & Share Link</p>

                {qr && (
                  <div className="relative inline-block rounded-3xl bg-white p-4 ring-1 ring-line shadow-md">
                    <img src={qr} alt={`QR code for @${mine.handle}`} className="mx-auto h-52 w-52" />
                  </div>
                )}

                <div>
                  <p className="font-display text-xl font-bold text-ink">airpal.me/@{mine.handle}</p>
                  <p className="text-xs text-mute mt-0.5">{tapsToday(mine.handle)} profile taps today</p>
                </div>

                {/* Australian Air Zoo Hunt Toggle */}
                <label className="mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-paper p-3 text-xs font-medium border border-line cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zooHunt}
                    onChange={(e) => setZooHunt(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                  />
                  <span>Air Zoo Hunt — display collectible Aussie sticker on QR</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <Button
                    className="h-11 font-semibold gap-2 shadow-sm"
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: `${mine.name} (@${mine.handle})`,
                            text: mine.shortWhy || "Connect on AirPal",
                            url: share,
                          })
                          .catch(() => {});
                      } else {
                        void navigator.clipboard.writeText(share);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                        toast.success("Profile URL copied to clipboard");
                      }
                    }}
                  >
                    {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                    <span>{copiedLink ? "Copied!" : "Share Profile"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="h-11 font-semibold border border-line bg-paper hover:bg-card gap-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(share);
                      toast.success("Profile URL copied");
                    }}
                  >
                    <Copy size={16} />
                    <span>Copy URL</span>
                  </Button>
                </div>

                {qr && (
                  <a
                    href={qr}
                    download={`airpal-${mine.handle}-qr.png`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold text-brand hover:underline"
                  >
                    <Download size={14} />
                    <span>Download QR Code Image</span>
                  </a>
                )}
              </div>

              {/* Transfer Handle Card */}
              <div className="rounded-3xl border border-line bg-card p-6 shadow-xs space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Transfer / Change Handle</p>
                <p className="text-xs text-mute">
                  Move your current bio profile to a new available handle name.
                </p>

                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const err = handleError(nextHandle);
                    if (err) {
                      toast.error(err);
                      return;
                    }
                    void transferHandle(mine.handle, nextHandle)
                      .then((h) => {
                        toast.success(`Handle transferred to @${h}`);
                        setNextHandle("");
                      })
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to transfer handle"));
                  }}
                >
                  <input
                    value={nextHandle}
                    onChange={(e) => setNextHandle(normalizeHandle(e.target.value))}
                    placeholder="newhandle"
                    className={fieldInput}
                  />
                  <Button type="submit" variant="ghost" className="w-full border border-line h-11 font-semibold" disabled={!nextHandle}>
                    Transfer Handle
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Live Interactive Preview (Desktop & Tablet Web) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
              <Eye size={14} className="text-gold" />
              <span>Real-Time Live Profile Preview</span>
            </p>
            {renderLivePreviewCard()}
          </div>
        </div>
      </div>

      {/* Mobile Live Preview Drawer Sheet Modal (< lg screen) */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <Eye size={14} /> Live Profile Preview
              </span>
              <button
                type="button"
                className="rounded-full p-2 text-mute hover:bg-card hover:text-ink"
                onClick={() => setMobilePreviewOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {renderLivePreviewCard()}
            <Button className="mt-4 w-full h-11 font-semibold" onClick={() => setMobilePreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
