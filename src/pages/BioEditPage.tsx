import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  HeartHandshake,
  Link2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  PhoneCall,
  Plus,
  QrCode,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  User,
  UserCheck,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  AVAILABILITY_STATUSES,
  BIO_LINK_TYPES,
  bioPath,
  catalogDeals,
  isBusinessKind,
  isSocialLinkType,
  type AvailabilityStatus,
  type BioCatalogItem,
  type BioCatalogKind,
  type BioLink,
  type BioLinkType,
  type BioProfile,
  type BioVisibility,
} from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { BioCatalogEditor } from "@/components/bio/BioCatalogEditor";
import { useBio } from "@/contexts/BioContext";
import { ImageField } from "@/components/media/ImageField";
import { makeQrDataUrl } from "@/lib/qr";
import { toPublicUrl } from "@/lib/public-origin";
import { TradingHoursField } from "@/components/forms/TradingHoursField";
import { CitySuburbRegionField } from "@/components/forms/CitySuburbRegionField";
import { cn } from "@/lib/cn";
import { PhoneField } from "@/components/forms/PhoneField";
import { isValidPhone } from "@shared/geo-address";
import { fieldInput } from "@/components/forms/ValidField";
import { GooglePlaceImportCard, PersonalProfileListingHint } from "@/components/business/GooglePlaceImport";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { Photo } from "@/components/ui/Photo";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { triggerHaptic } from "@/lib/native";

// Personal Profile Category / Vibe Presets
const PERSONAL_CATEGORY_PRESETS = [
  { id: "Explorer & Local", label: "Explorer & Local 🧭" },
  { id: "Travel Companion", label: "Travel Companion ✈️" },
  { id: "Creator & Artist", label: "Creator & Artist 🎨" },
  { id: "Food & Coffee Lover", label: "Food & Coffee Lover ☕" },
  { id: "Fashion & Style", label: "Fashion & Style 👗" },
  { id: "Fitness & Wellness", label: "Fitness & Wellness 🏃" },
  { id: "Student & Explorer", label: "Student & Explorer 🎒" },
  { id: "Community Host", label: "Community Host 🌟" },
] as const;

// Business Profile Category Presets
const BUSINESS_CATEGORY_PRESETS = [
  { id: "Stay & Accommodation", label: "Stay & Hotel 🏢" },
  { id: "Boutique Hotel", label: "Boutique Hotel 🏨" },
  { id: "Food & Drink", label: "Food & Drink ☕" },
  { id: "Restaurant & Bar", label: "Restaurant & Bar 🍽️" },
  { id: "Local Business", label: "Local Business 🏪" },
  { id: "Boutique & Retail", label: "Boutique & Retail 🛍️" },
  { id: "Beauty & Wellness", label: "Beauty & Wellness 💈" },
  { id: "Music & Venue", label: "Events & Venue 🎭" },
  { id: "Services & Trades", label: "Services & Trades 🛠️" },
] as const;

// Personal Action Button Presets
const PERSONAL_CTA_PRESETS = [
  "Catch Up",
  "Say Hello",
  "Plan Hangout",
  "Message WhatsApp",
  "Connect",
  "Follow Me",
] as const;

// Business Action Button Presets
const BUSINESS_CTA_PRESETS = [
  "View Stay & Guide",
  "Book Direct",
  "Order Online",
  "Book Table",
  "View Menu",
  "Get Directions",
  "Message WhatsApp",
  "Contact Business",
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
    example: "e.g. alex_sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:@)?/i,
  },
  facebook: {
    prefix: "https://facebook.com/",
    cleanPrefix: "facebook.com/",
    placeholder: "page or username",
    example: "e.g. alex.sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
  },
  tiktok: {
    prefix: "https://tiktok.com/@",
    cleanPrefix: "tiktok.com/@",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(?:@)?/i,
  },
  x: {
    prefix: "https://x.com/",
    cleanPrefix: "x.com/",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:@)?/i,
  },
  youtube: {
    prefix: "https://youtube.com/@",
    cleanPrefix: "youtube.com/@",
    placeholder: "channel name",
    example: "e.g. alexsydney",
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
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?threads\.net\/(?:@)?/i,
  },
  snapchat: {
    prefix: "https://snapchat.com/add/",
    cleanPrefix: "snapchat.com/add/",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?snapchat\.com\/(?:add\/)?/i,
  },
  pinterest: {
    prefix: "https://pinterest.com/",
    cleanPrefix: "pinterest.com/",
    placeholder: "username",
    example: "e.g. alexsydney",
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
  const searchStr = useSearch();
  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const queryKind = params.get("kind");
  const queryHandle = params.get("handle");

  const { mine, business, profiles, updateProfile, tapsToday } = useBio();

  // Active target profile resolution: personal (mine) or business or selected handle
  const activeProfile: BioProfile | null = useMemo(() => {
    if (queryHandle) {
      const hit = profiles.find((p) => p.handle === queryHandle);
      if (hit) return hit;
    }
    if (queryKind === "business" && business) return business;
    if (queryKind === "person" && mine) return mine;
    return mine || business || profiles[0] || null;
  }, [business, mine, profiles, queryHandle, queryKind]);

  const isBusiness = isBusinessKind(activeProfile?.kind);

  const [tab, setTab] = useState<"profile" | "links" | "shop" | "share">("profile");
  const [saving, setSaving] = useState(false);

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
  const [visibility, setVisibility] = useState<BioVisibility>("friends");
  const [customStatus, setCustomStatus] = useState("");
  const [customStatusEmoji, setCustomStatusEmoji] = useState("☕");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");

  const [mapsPlaceId, setMapsPlaceId] = useState("");
  const [links, setLinks] = useState<BioLink[]>([]);
  const [products, setProducts] = useState<BioCatalogItem[]>([]);
  const [services, setServices] = useState<BioCatalogItem[]>([]);
  const [deals, setDeals] = useState<BioCatalogItem[]>([]);
  const [qr, setQr] = useState("");
  const [type, setType] = useState<BioLinkType>("website");
  const [href, setHref] = useState("");
  const [zooHunt, setZooHunt] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [preferredMeetingPlatform, setPreferredMeetingPlatform] = useState<
    "in_person" | "google_meet" | "facetime" | "zoom"
  >("in_person");

  // Mobile Live Preview Modal Sheet State
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Synchronize form states when active target profile changes
  useEffect(() => {
    if (!activeProfile) return;
    setName(activeProfile.name);
    setShortWhy(activeProfile.shortWhy || "");
    setAboutText(activeProfile.aboutText || "");
    setCategoryTag(
      activeProfile.categoryTag || (isBusinessKind(activeProfile.kind) ? "Local Business" : "Explorer & Local"),
    );
    setPronouns(activeProfile.pronouns || "");
    setLanguages(activeProfile.languages || "");
    setPrimaryCta(activeProfile.primaryCta || (isBusinessKind(activeProfile.kind) ? "Order Online" : "Catch Up"));
    setCity(activeProfile.city || "");
    setHours(activeProfile.hours || "");
    setOpenNow(activeProfile.openNow ?? true);
    setAvailabilityStatus(activeProfile.availabilityStatus || "available");
    setVisibility(activeProfile.visibility || "friends");
    setCustomStatus(activeProfile.customStatus || "");
    setCustomStatusEmoji(activeProfile.customStatusEmoji || "☕");
    setPhone(activeProfile.phone || "");
    setAvatar(activeProfile.avatar || "");
    setCover(activeProfile.cover || "");
    setMapsPlaceId(activeProfile.mapsPlaceId || "");
    setLinks(activeProfile.links || []);
    setProducts(activeProfile.products || []);
    setServices(activeProfile.services || []);
    setDeals(activeProfile.deals?.length ? activeProfile.deals : catalogDeals(activeProfile));
    setZooHunt(Boolean(activeProfile.zooHunt));
    setMeetingUrl(activeProfile.meetingUrl || "");
    setPreferredMeetingPlatform(activeProfile.preferredMeetingPlatform || "in_person");
    void makeQrDataUrl(toPublicUrl(bioPath(activeProfile.handle))).then(setQr);
  }, [activeProfile]);

  // Compute dirty/unsaved state
  const isDirty = useMemo(() => {
    if (!activeProfile) return false;
    return (
      name !== activeProfile.name ||
      shortWhy !== (activeProfile.shortWhy || "") ||
      aboutText !== (activeProfile.aboutText || "") ||
      categoryTag !== (activeProfile.categoryTag || (isBusiness ? "Local Business" : "Explorer & Local")) ||
      pronouns !== (activeProfile.pronouns || "") ||
      languages !== (activeProfile.languages || "") ||
      primaryCta !== (activeProfile.primaryCta || (isBusiness ? "Order Online" : "Catch Up")) ||
      city !== (activeProfile.city || "") ||
      hours !== (activeProfile.hours || "") ||
      availabilityStatus !== (activeProfile.availabilityStatus || "available") ||
      visibility !== (activeProfile.visibility || "friends") ||
      customStatus !== (activeProfile.customStatus || "") ||
      phone !== (activeProfile.phone || "") ||
      meetingUrl !== (activeProfile.meetingUrl || "") ||
      preferredMeetingPlatform !== (activeProfile.preferredMeetingPlatform || "in_person") ||
      zooHunt !== Boolean(activeProfile.zooHunt)
    );
  }, [
    activeProfile,
    name,
    shortWhy,
    aboutText,
    categoryTag,
    isBusiness,
    pronouns,
    languages,
    primaryCta,
    city,
    hours,
    availabilityStatus,
    visibility,
    customStatus,
    phone,
    meetingUrl,
    preferredMeetingPlatform,
    zooHunt,
  ]);

  if (!activeProfile) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="rounded-[32px] bg-card p-8 sm:p-10 shadow-clay ring-1 ring-line max-w-md w-full">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-accent mb-5 ring-1 ring-brand/20">
            <UserRound size={32} />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">No @handle yet</p>
          <p className="mt-2.5 text-sm text-mute leading-relaxed">
            Create your AirPal Me digital bio or register an AirPal Pass business place to launch your public profile.
          </p>
          <div className="mt-7 space-y-3">
            <Button
              className="w-full h-12 text-sm font-semibold shadow-md gap-2 rounded-2xl"
              onClick={() => nav("/bio/setup")}
            >
              <User size={16} />
              Set Up AirPal Me Bio
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-sm font-semibold border border-line gap-2 rounded-2xl bg-paper hover:bg-card"
              onClick={() => nav("/bio/setup?kind=business")}
            >
              <Store size={16} />
              Add Business Place
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const share = toPublicUrl(bioPath(activeProfile.handle));

  async function handleSaveAll(e?: FormEvent) {
    if (e) e.preventDefault();
    if (phone && !isValidPhone(phone)) {
      toast.error("Phone needs a valid country code (e.g. +61 400 123 456)");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        handle: activeProfile!.handle,
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
        visibility,
        customStatus: customStatus.trim() || undefined,
        customStatusEmoji: customStatusEmoji.trim() || undefined,
        phone,
        avatar: avatar.trim() || undefined,
        cover: cover.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        zooHunt,
        meetingUrl: meetingUrl.trim() || undefined,
        preferredMeetingPlatform,
        links,
        products,
        services,
        deals,
      });
      void triggerHaptic("success");
      toast.success(isBusiness ? "Saved business place profile" : "Saved AirPal Me profile");
    } catch (err) {
      void triggerHaptic("error");
      toast.error(err instanceof Error ? err.message : "Could not save profile changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onStoredPhoto(kind: "avatar" | "cover", src?: string) {
    if (!activeProfile) return;
    if (kind === "avatar") setAvatar(src || "");
    else setCover(src || "");
    await updateProfile({ handle: activeProfile.handle, [kind]: src || "" });
    void triggerHaptic("light");
    toast.success(kind === "avatar" ? "Avatar updated" : "Cover banner updated");
  }

  async function saveCatalog(kind: BioCatalogKind, rows: BioCatalogItem[]) {
    const nextProducts = kind === "product" ? rows : products;
    const nextServices = kind === "service" ? rows : services;
    const nextDeals = kind === "deal" ? rows : deals;
    if (kind === "product") setProducts(rows);
    if (kind === "service") setServices(rows);
    if (kind === "deal") setDeals(rows);
    await updateProfile({
      handle: activeProfile!.handle,
      products: nextProducts,
      services: nextServices,
      deals: nextDeals,
    });
    void triggerHaptic("light");
    toast.success("Catalog updated");
  }

  const statusInfo = AVAILABILITY_STATUSES[availabilityStatus] || AVAILABILITY_STATUSES.available;

  // Live Phone Screen Mockup Preview (used on desktop sidebar and mobile sheet)
  const renderLivePhoneMockup = () => (
    <div className="relative mx-auto w-full max-w-[340px] select-none rounded-[44px] border-[5px] border-slate-900/90 dark:border-slate-800 bg-card p-1 shadow-2xl ring-1 ring-black/10">
      {/* Device Hardware Top Speaker & Notch */}
      <div className="relative z-30 flex h-6 w-full items-center justify-between px-6 pt-1">
        <span className="font-mono text-[10px] font-semibold text-ink/80">9:41</span>
        <div className="h-3.5 w-20 rounded-full bg-slate-900/90 dark:bg-slate-700" />
        <div className="flex items-center gap-1 text-[10px] text-ink/80">
          <span>5G</span>
          <div className="h-2 w-3 rounded-[2px] border border-current p-[1px]">
            <div className="h-full w-full bg-current" />
          </div>
        </div>
      </div>

      {/* Screen Inner Viewport Container */}
      <div className="relative mt-1 max-h-[560px] overflow-y-auto rounded-[36px] bg-canvas scrollbar-none pb-6">
        {/* Distinction Header Banner */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b",
            isBusiness
              ? "bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/20"
              : "bg-brand/10 text-accent border-brand/20",
          )}
        >
          <span className="flex items-center gap-1.5">
            {isBusiness ? <Store size={12} /> : <UserCheck size={12} />}
            {isBusiness ? "AirPal Pass Place" : "AirPal Me Bio"}
          </span>
          <span className="font-mono text-[10px] lowercase text-ink/70">@{activeProfile.handle}</span>
        </div>

        {/* Cover Photo Hero */}
        <div className="relative">
          {cover ? (
            <Photo src={cover} className="h-32 w-full object-cover" />
          ) : (
            <div
              className={cn(
                "relative h-32 w-full overflow-hidden",
                isBusiness
                  ? "bg-gradient-to-br from-[#1d1e22] via-[#2a2c33] to-[#121316]"
                  : "bg-gradient-to-br from-[#121829] via-[#1c2438] to-[#0f1424]",
              )}
            >
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1805db_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
            </div>
          )}

          {/* Real-time Indicator Pill */}
          <div className="absolute right-2.5 top-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
              PREVIEW
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="px-4">
          {/* Avatar and Handle Row */}
          <div className="flex items-end justify-between -mt-9">
            <div className="relative">
              <div
                className={cn(
                  "relative z-10 h-20 w-20 overflow-hidden rounded-full bg-paper ring-3 shadow-md transition-all",
                  statusInfo.ringClass,
                )}
              >
                {avatar ? (
                  <Photo src={avatar} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-neutral-900 font-display text-xl font-bold text-white">
                    {(name || "A")[0]}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 z-20">
                <BioKindIcon kind={activeProfile.kind} className="h-5 w-5 shadow-xs ring-1 ring-card" />
              </div>
            </div>

            <div className="mb-0.5">
              <BioHandleButton handle={activeProfile.handle} />
            </div>
          </div>

          {/* Title, Category & Handle */}
          <div className="mt-2.5 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display text-lg font-bold tracking-tight text-ink truncate max-w-[190px]">
                {name || "Your Name"}
              </h3>
              {categoryTag && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    isBusiness ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-brand/10 text-accent",
                  )}
                >
                  {categoryTag}
                </span>
              )}
            </div>

            <p className="text-[11px] font-medium text-mute mt-0.5">
              @{activeProfile.handle}
              {pronouns && ` · ${pronouns}`}
            </p>

            {/* Live Availability Status Badge */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                  statusInfo.badgeBg,
                  statusInfo.textColor,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                <span>{statusInfo.label}</span>
                {customStatus && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-normal text-ink/90 truncate max-w-[120px]">
                      {customStatusEmoji} {customStatus}
                    </span>
                  </>
                )}
              </span>
              {hours && <span className="text-[10px] text-mute font-medium truncate max-w-[110px]">· {hours}</span>}
            </div>

            {/* Location & Languages */}
            {(city || languages) && (
              <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[11px] text-mute font-medium">
                {city && (
                  <>
                    <MapPin size={11} className="text-accent shrink-0" />
                    <span className="truncate max-w-[120px]">{city}</span>
                  </>
                )}
                {city && languages && <span>·</span>}
                {languages && <span className="truncate max-w-[120px]">{languages}</span>}
              </p>
            )}

            {/* Tagline */}
            {shortWhy && <p className="mt-1.5 text-[11px] leading-relaxed text-ink/85 font-normal">{shortWhy}</p>}

            {/* About Story Box */}
            {aboutText && (
              <div className="mt-2 rounded-xl bg-card p-2.5 text-[11px] leading-relaxed text-ink/80 border border-line/70 shadow-2xs">
                <p className="font-semibold text-[9px] uppercase tracking-wider text-mute mb-0.5">
                  {isBusiness ? "About Venue" : "About Story"}
                </p>
                <p className="whitespace-pre-line line-clamp-3">{aboutText}</p>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="mt-3">
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white shadow-xs transition",
                isBusiness ? "bg-amber-600 hover:bg-amber-700" : "bg-brand hover:bg-brand-ink",
              )}
            >
              {isBusiness ? <Building2 size={13} /> : <HeartHandshake size={13} />}
              <span className="truncate">{primaryCta || (isBusiness ? "Order Online" : "Catch Up")}</span>
            </button>
          </div>

          {/* Quick Action Row */}
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="flex h-8 items-center justify-center gap-1 rounded-full bg-card border border-line text-[10px] font-medium text-ink">
              <Globe size={11} className="text-sky-600" />
              <span>Website</span>
            </div>
            <div className="flex h-8 items-center justify-center gap-1 rounded-full bg-card border border-line text-[10px] font-medium text-ink">
              <MessageCircle size={11} className="text-emerald-600" />
              <span>WhatsApp</span>
            </div>
            <div className="flex h-8 items-center justify-center gap-1 rounded-full bg-card border border-line text-[10px] font-medium text-ink">
              <Phone size={11} className="text-amber-600" />
              <span>Call</span>
            </div>
          </div>

          {/* Deals / Special Highlight */}
          {deals.length > 0 && (
            <div className="mt-3 rounded-xl bg-gradient-to-br from-paper to-card p-2.5 border border-gold/30">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                  <Sparkles size={10} /> Offer
                </span>
                <span className="text-[9px] text-mute">{deals[0].badge || "Offer"}</span>
              </div>
              <p className="mt-0.5 font-semibold text-[11px] text-ink truncate">{deals[0].title}</p>
            </div>
          )}

          {/* Bio Links stack */}
          {links.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-mute">
                {isBusiness ? "Place Links" : "Links"} ({links.length})
              </p>
              {links.slice(0, 3).map((l) => (
                <div
                  key={l.id}
                  className="flex h-8 items-center justify-between rounded-lg bg-card px-2.5 text-[10px] font-medium text-ink border border-line/60"
                >
                  <span className="truncate">{l.label}</span>
                  <ExternalLink size={10} className="text-mute shrink-0" />
                </div>
              ))}
              {links.length > 3 && (
                <p className="text-[9px] text-center text-mute font-medium">+ {links.length - 3} more links</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]">
      {/* Top Ambient Glow Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-96 opacity-40 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(24,5,219,0.2),rgba(255,255,255,0))] dark:opacity-20"
      />

      {/* 1. Liquid Glass Sticky Header Bar */}
      <header className="sticky top-0 z-30 apple-liquid-glass-nav transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Back Arrow + Profile Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                nav(bioPath(activeProfile.handle));
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card border border-line text-ink transition hover:bg-paper active:scale-95 shadow-xs cursor-pointer"
              aria-label="Back to public bio"
              title="Back to public bio"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-accent">@{activeProfile.handle}</span>
                <BioKindBadge kind={activeProfile.kind} />
                {/* Specific Personal Profile text for E2E and clear distinction */}
                {!isBusiness && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-brand/10 text-accent">
                    Personal Profile
                  </span>
                )}
                {isBusiness && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    Business Profile
                  </span>
                )}
              </div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink truncate">
                {isBusiness ? "Edit Place Profile" : "Edit Digital Bio"}
              </h1>
            </div>
          </div>

          {/* Right: Actions & Save Primary Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Public Profile Link */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex gap-1.5 rounded-full border border-line bg-card/80 px-3.5 text-xs font-semibold text-ink shadow-xs hover:bg-paper cursor-pointer"
              onClick={() => {
                void triggerHaptic("light");
                nav(bioPath(activeProfile.handle));
              }}
            >
              <ExternalLink size={13} className="text-accent" />
              <span>View Public</span>
            </Button>

            {/* Mobile Live Preview Trigger Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink shadow-xs hover:bg-paper cursor-pointer"
              onClick={() => {
                void triggerHaptic("medium");
                setMobilePreviewOpen(true);
              }}
            >
              <Eye size={14} className="text-accent" />
              <span>Preview</span>
            </Button>

            {/* Save Button */}
            <Button
              size="sm"
              className={cn(
                "h-10 px-4 rounded-full font-semibold gap-1.5 shadow-md transition cursor-pointer active:scale-95",
                isBusiness
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : isDirty
                    ? "bg-brand hover:bg-brand-ink text-white ring-2 ring-brand/30 ring-offset-2"
                    : "bg-brand hover:bg-brand-ink text-white",
              )}
              disabled={saving}
              onClick={() => void handleSaveAll()}
            >
              {saving ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={15} />
              )}
              <span>{saving ? "Saving…" : isDirty ? "Save Changes" : "Saved"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-5">
        {/* 2. Identity Switcher & Profile Distinction Card */}
        <div className="rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs border border-line/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
            {/* Identity Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ring-1",
                  isBusiness
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/20"
                    : "bg-brand/10 text-accent ring-brand/20",
                )}
              >
                {isBusiness ? <Store size={22} /> : <UserRound size={22} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    {isBusiness ? "AirPal Pass Place Profile" : "AirPal Me Personal Bio"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                      isBusiness ? "bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-brand/10 text-accent",
                    )}
                  >
                    Active Profile
                  </span>
                </div>
                <p className="text-xs text-mute mt-0.5 leading-relaxed truncate">
                  {isBusiness
                    ? "Storefront hours, Google Place sync, menus, products, and direct booking links."
                    : "Your personal life handle for catch-ups, friend hangouts, and networking wallet passes."}
                </p>
              </div>
            </div>

            {/* Profile Switcher or Creation CTAs */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
              {mine && business && (
                <div className="inline-flex rounded-full bg-paper p-1 ring-1 ring-line">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      nav("/bio/edit?kind=person");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer",
                      !isBusiness ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                    )}
                  >
                    <UserRound size={13} />
                    <span>@{mine.handle}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      nav("/bio/edit?kind=business");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer",
                      isBusiness ? "bg-amber-600 text-white shadow-xs" : "text-mute hover:text-ink",
                    )}
                  >
                    <Store size={13} />
                    <span>@{business.handle}</span>
                  </button>
                </div>
              )}

              {mine && !business && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-paper text-xs font-semibold text-ink hover:bg-card shadow-xs cursor-pointer"
                  onClick={() => {
                    void triggerHaptic("light");
                    nav("/bio/setup?kind=business");
                  }}
                >
                  <Plus size={13} className="text-accent" />
                  <span>Add Business Place</span>
                </Button>
              )}

              {!mine && business && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-paper text-xs font-semibold text-ink hover:bg-card shadow-xs cursor-pointer"
                  onClick={() => {
                    void triggerHaptic("light");
                    nav("/bio/setup");
                  }}
                >
                  <Plus size={13} className="text-accent" />
                  <span>Claim Personal @handle</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Two-Column Layout: Left Editor Tabs + Right Sticky Phone Mockup */}
        <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Segmented Tabs & Editors */}
          <div className="lg:col-span-7">
            {/* Apple HIG Segmented Navigation Tabs */}
            <div
              className="flex rounded-2xl bg-paper p-1.5 ring-1 ring-line shadow-xs"
              role="tablist"
              aria-label="Profile sections"
            >
              {(
                [
                  { id: "profile", label: "Profile", icon: Edit3, count: undefined },
                  { id: "links", label: "Links", icon: Link2, count: links.length },
                  {
                    id: "shop",
                    label: isBusiness ? "Menu & Catalog" : "Shop & Deals",
                    icon: Package,
                    count: products.length + services.length + deals.length,
                  },
                  { id: "share", label: "Share & Pass", icon: QrCode, count: undefined },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => {
                    void triggerHaptic("selection");
                    setTab(item.id);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 h-11 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer",
                    tab === item.id
                      ? isBusiness
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-white/50",
                  )}
                >
                  <item.icon size={15} />
                  <span className="truncate">{item.label}</span>
                  {typeof item.count === "number" && item.count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        tab === item.id ? "bg-white/25 text-white" : "bg-card text-mute ring-1 ring-line",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB 1: PROFILE EDITOR */}
            {tab === "profile" && (
              <form className="mt-6 space-y-6" onSubmit={(e) => void handleSaveAll(e)}>
                {/* 1.1 Media & Visual Studio Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Camera size={14} />
                      <span>Visual Identity & Photos</span>
                    </p>
                    <span className="text-[11px] text-mute font-medium">
                      {isBusiness ? "Storefront Banner & Logo" : "Cover Photo & Avatar"}
                    </span>
                  </div>

                  <div className="space-y-5">
                    {/* Cover Banner */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-ink">
                          {isBusiness ? "Storefront Hero Banner" : "Cover Banner Photo"}
                        </label>
                        <span className="text-[11px] text-mute">16:9 ratio recommended</span>
                      </div>
                      <ImageField kind="cover" value={cover} onChange={(src) => void onStoredPhoto("cover", src)} />
                    </div>

                    {/* Avatar */}
                    <div className="pt-2 border-t border-line/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-ink">
                          {isBusiness ? "Business Logo / Mark" : "Profile Avatar Picture"}
                        </label>
                        <span className="text-[11px] text-mute">Square portrait photo</span>
                      </div>
                      <ImageField
                        kind="avatar"
                        round
                        value={avatar}
                        onChange={(src) => void onStoredPhoto("avatar", src)}
                      />
                    </div>
                  </div>
                </div>

                {/* 1.2 Basic Profile Info Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Edit3 size={14} />
                      <span>Basic Profile Info</span>
                    </p>
                    <span className="font-mono text-[11px] text-mute">@{activeProfile.handle}</span>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      {isBusiness ? "Business / Place Name" : "Your Display Name"}
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isBusiness ? "e.g. Harbour Brew Cafe" : "e.g. Alex Morgan"}
                      required
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute">
                      {isBusiness
                        ? "The public trading name shown on your place pass and precinct guide."
                        : "Your primary name shown on your digital bio and catch-up invites."}
                    </p>
                  </div>

                  {/* Category / Vibe Badge Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      {isBusiness ? "Business Category" : "Profile Category / Vibe"}
                    </label>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {(isBusiness ? BUSINESS_CATEGORY_PRESETS : PERSONAL_CATEGORY_PRESETS).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            void triggerHaptic("selection");
                            setCategoryTag(cat.id);
                          }}
                          aria-pressed={categoryTag === cat.id}
                          className={cn(
                            "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-medium transition active:scale-95 cursor-pointer",
                            categoryTag === cat.id
                              ? isBusiness
                                ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                : "bg-brand text-white shadow-xs ring-1 ring-brand"
                              : "bg-paper border border-line text-ink hover:border-brand/40",
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tagline / 1-Line Headline */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                        Tagline (1-Line Headline)
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          shortWhy.length > 90 ? "text-amber-600 font-bold" : "text-mute",
                        )}
                      >
                        {shortWhy.length}/100
                      </span>
                    </div>
                    <input
                      value={shortWhy}
                      maxLength={100}
                      onChange={(e) => setShortWhy(e.target.value)}
                      placeholder={
                        isBusiness
                          ? "e.g. Specialty coffee, artisanal roasts & harbour views"
                          : "e.g. Sydney local, coffee enthusiast & travel companion"
                      }
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute">
                      A punchy 1-line headline displayed right under your name across AirPal.
                    </p>
                  </div>

                  {/* Extended Story / About */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                        {isBusiness ? "About Your Place / Story" : "About Story / Extended Bio"}
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          aboutText.length > 250 ? "text-amber-600 font-bold" : "text-mute",
                        )}
                      >
                        {aboutText.length}/280
                      </span>
                    </div>
                    <textarea
                      value={aboutText}
                      maxLength={280}
                      rows={3}
                      onChange={(e) => setAboutText(e.target.value)}
                      placeholder={
                        isBusiness
                          ? "Tell customers what makes your venue, menu, or services special…"
                          : "Share who you are, your background, hobbies, or what you love exploring…"
                      }
                      className="w-full rounded-2xl border border-line bg-paper p-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus:border-ink placeholder:text-mute/60 resize-none"
                    />
                  </div>

                  {/* Pronouns & Languages (Personal only) */}
                  {!isBusiness && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line/60">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Pronouns (Optional)
                        </label>
                        <input
                          value={pronouns}
                          onChange={(e) => setPronouns(e.target.value)}
                          placeholder="e.g. She/Her, They/Them"
                          className={fieldInput}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Languages Spoken
                        </label>
                        <input
                          value={languages}
                          onChange={(e) => setLanguages(e.target.value)}
                          placeholder="e.g. English, Spanish, Japanese"
                          className={fieldInput}
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Call to Action Button Picker */}
                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Primary Profile Action Button
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(isBusiness ? BUSINESS_CTA_PRESETS : PERSONAL_CTA_PRESETS).map((cta) => (
                        <button
                          key={cta}
                          type="button"
                          onClick={() => {
                            void triggerHaptic("selection");
                            setPrimaryCta(cta);
                          }}
                          aria-pressed={primaryCta === cta}
                          className={cn(
                            "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-medium transition active:scale-95 cursor-pointer",
                            primaryCta === cta
                              ? isBusiness
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-brand text-white shadow-xs"
                              : "bg-paper border border-line text-ink hover:border-brand/40",
                          )}
                        >
                          {cta}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-mute">
                      Configures the prominent action button on your public digital card.
                    </p>
                  </div>
                </div>

                {/* 1.3 Live Availability & Presence Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Sparkles size={14} />
                      <span>Live Presence & Availability</span>
                    </p>
                    <span className="text-[11px] text-mute font-medium">Real-time status</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Current Availability Status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(AVAILABILITY_STATUSES) as AvailabilityStatus[]).map((stKey) => {
                        const st = AVAILABILITY_STATUSES[stKey];
                        const isSelected = availabilityStatus === stKey;
                        return (
                          <button
                            key={stKey}
                            type="button"
                            onClick={() => {
                              void triggerHaptic("selection");
                              setAvailabilityStatus(stKey);
                              setOpenNow(stKey === "available");
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-2xl p-3 text-left border text-xs font-semibold transition active:scale-95 cursor-pointer",
                              isSelected
                                ? isBusiness
                                  ? "bg-amber-500/10 border-amber-600 text-amber-900 dark:text-amber-300 shadow-xs ring-1 ring-amber-600/30"
                                  : "bg-brand/10 border-brand text-accent shadow-xs ring-1 ring-brand/30"
                                : "bg-paper border-line text-ink hover:bg-card",
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", st.dotColor)} />
                            <span className="truncate">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Status Emoji & Message */}
                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Custom Status Message & Emoji
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        value={customStatusEmoji}
                        onChange={(e) => setCustomStatusEmoji(e.target.value)}
                        placeholder="☕"
                        maxLength={4}
                        aria-label="Status Emoji"
                        className="h-11 rounded-2xl border border-line bg-paper text-center text-lg outline-none focus:border-ink"
                      />
                      <input
                        value={customStatus}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        placeholder={isBusiness ? "e.g. Fresh pastries today" : "e.g. Coffee at Rocks Cafe"}
                        aria-label="Status message text"
                        className={`col-span-3 ${fieldInput}`}
                      />
                    </div>
                    <p className="text-[11px] text-mute">
                      Shown next to your active badge on your profile and digital pass.
                    </p>
                  </div>
                </div>

                {/* 1.4 Location & Hours Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <MapPin size={14} />
                      <span>Location, Hours & Contact</span>
                    </p>
                  </div>

                  {/* City / Location */}
                  <CitySuburbRegionField value={city} onChange={setCity} inputClassName={fieldInput} />

                  {/* Trading / Opening Hours */}
                  <TradingHoursField value={hours} onChange={setHours} inputClassName={fieldInput} />

                  {/* Contact Phone */}
                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Contact Phone Number
                    </label>
                    <PhoneField value={phone} onChange={setPhone} />
                    <p className="text-[11px] text-mute">
                      Used for one-tap WhatsApp messaging and direct calling from your profile card.
                    </p>
                  </div>
                </div>

                {/* 1.5 Virtual Sync & Video Call Platform */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Video size={14} />
                      <span>Meet &amp; Hangout · Video Sync</span>
                    </p>
                    <span className="text-[10px] font-bold text-accent bg-brand/10 rounded-full px-2.5 py-0.5">
                      Calendar Sync
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Preferred Meeting Platform
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "in_person" as const, label: "In Person", hint: "Local venues", Icon: MapPin },
                        { id: "google_meet" as const, label: "Google Meet", hint: "meet.google.com", Icon: Video },
                        { id: "facetime" as const, label: "FaceTime", hint: "Apple & Web", Icon: PhoneCall },
                      ].map((opt) => {
                        const Icon = opt.Icon;
                        const isSelected = preferredMeetingPlatform === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              void triggerHaptic("selection");
                              setPreferredMeetingPlatform(opt.id);
                            }}
                            className={cn(
                              "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition active:scale-95 cursor-pointer",
                              isSelected
                                ? isBusiness
                                  ? "bg-amber-500/10 border-amber-600 text-amber-900 dark:text-amber-300 font-bold shadow-xs"
                                  : "bg-brand/10 border-brand text-accent font-bold shadow-xs"
                                : "bg-paper border-line text-ink hover:bg-card",
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-bold">
                              <Icon size={13} />
                              <span>{opt.label}</span>
                            </span>
                            <span className="text-[10px] font-medium opacity-70">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Default Video Room URL or Apple ID
                    </label>
                    <input
                      type="text"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder={
                        preferredMeetingPlatform === "facetime"
                          ? "https://facetime.apple.com/... or Apple ID"
                          : "https://meet.google.com/xxx-yyyy-zzz"
                      }
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute leading-relaxed">
                      Pre-fills when visitors schedule a catch-up or hangout, and embeds directly into Apple &amp;
                      Google Calendar invites.
                    </p>
                  </div>
                </div>

                {/* 1.6 Profile Visibility (Personal only) */}
                {!isBusiness && (
                  <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-line/60 pb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                        <Shield size={14} />
                        <span>Profile Privacy & Visibility</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Profile visibility">
                      {(
                        [
                          { id: "public", label: "Public", hint: "Everyone on AirPal" },
                          { id: "friends", label: "Friends", hint: "Connected members" },
                          { id: "private", label: "Private", hint: "Only you" },
                        ] as Array<{ id: BioVisibility; label: string; hint: string }>
                      ).map((opt) => {
                        const isSelected = visibility === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => {
                              void triggerHaptic("selection");
                              setVisibility(opt.id);
                            }}
                            className={cn(
                              "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl border p-2 text-center transition active:scale-95 cursor-pointer",
                              isSelected
                                ? "bg-brand/10 border-brand text-accent font-bold shadow-xs ring-1 ring-brand/30"
                                : "bg-paper border-line text-ink hover:bg-card",
                            )}
                          >
                            <span className="text-xs font-bold">{opt.label}</span>
                            <span className="text-[10px] font-medium opacity-70">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-mute">
                      Friends means mutual connections — anyone following you or connected via hangouts.
                    </p>
                  </div>
                )}

                {/* 1.7 Business-Only Google Place Import Card vs Personal Hint */}
                {isBusiness ? (
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
                      void triggerHaptic("success");
                      toast.success("Imported from Google — save to keep changes");
                    }}
                  />
                ) : (
                  <PersonalProfileListingHint
                    hasBusiness={Boolean(business)}
                    onOpenBusiness={() => {
                      void triggerHaptic("light");
                      nav(business ? "/bio/edit?kind=business" : "/bio/setup?kind=business");
                    }}
                  />
                )}

                {/* Save All Profile Changes Button */}
                <Button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "h-13 w-full text-base font-semibold shadow-md gap-2 rounded-2xl cursor-pointer active:scale-98",
                    isBusiness
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-brand hover:bg-brand-ink text-white",
                  )}
                >
                  {saving ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  <span>{saving ? "Saving Changes…" : "Save All Profile Changes"}</span>
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
                    {/* Quick-Pick Trays */}
                    <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-5">
                      {/* Social Media Networks */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                          <Globe size={13} />
                          <span>Social Media Networks</span>
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {BIO_LINK_TYPES.filter((t) => isSocialLinkType(t.id)).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void triggerHaptic("selection");
                                setType(t.id);
                                setHref("");
                              }}
                              aria-pressed={type === t.id}
                              className={cn(
                                "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition active:scale-95 cursor-pointer",
                                type === t.id
                                  ? isBusiness
                                    ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                    : "bg-brand text-white shadow-xs ring-1 ring-brand"
                                  : "bg-paper border border-line text-ink hover:bg-card",
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions & Direct Links */}
                      <div className="pt-2 border-t border-line/60">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                          <Link2 size={13} />
                          <span>Direct Actions &amp; Web Links</span>
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {BIO_LINK_TYPES.filter((t) => !isSocialLinkType(t.id)).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void triggerHaptic("selection");
                                setType(t.id);
                                setHref("");
                              }}
                              aria-pressed={type === t.id}
                              className={cn(
                                "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition active:scale-95 cursor-pointer",
                                type === t.id
                                  ? isBusiness
                                    ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                    : "bg-brand text-white shadow-xs ring-1 ring-brand"
                                  : "bg-paper border border-line text-ink hover:bg-card",
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
                      className="space-y-3 rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs"
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
                        void updateProfile({ handle: activeProfile.handle, links: next })
                          .then(() => {
                            void triggerHaptic("success");
                            toast.success(`Added ${selectedLabel} link`);
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof Error ? err.message : "Could not save that link to your account",
                            ),
                          );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Add {selectedLabel} Link
                        </span>
                        {social && <span className="text-[11px] text-mute font-mono">{social.example}</span>}
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
                            social
                              ? social.placeholder
                              : type === "call"
                                ? "+61 400 123 456"
                                : "https://yourwebsite.com"
                          }
                          className="h-12 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-mute/60"
                        />

                        <Button
                          type="submit"
                          size="sm"
                          className="m-1.5 min-h-[44px] shrink-0 px-4 font-semibold rounded-xl cursor-pointer"
                        >
                          Add Link
                        </Button>
                      </div>

                      <p className="text-[11px] text-mute">
                        {social
                          ? "Enter your username/handle. AirPal formats the destination URL automatically."
                          : type === "call"
                            ? "Enter phone number with international country code."
                            : "Enter complete destination web URL."}
                      </p>
                    </form>

                    {/* Active Links List */}
                    <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Active Bio Links ({links.length})
                        </p>
                        {links.length > 0 && (
                          <span className="text-[11px] text-mute">Displayed on your public profile</span>
                        )}
                      </div>

                      {links.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-line p-8 text-center space-y-2">
                          <Link2 size={24} className="mx-auto text-mute/60" />
                          <p className="text-xs font-semibold text-ink">No links added yet</p>
                          <p className="text-xs text-mute">Select any social network or action above to add one.</p>
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {links.map((l) => (
                            <li
                              key={l.id}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 border border-line/70 shadow-xs hover:border-line transition"
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
                                  className="mt-0.5 block truncate text-xs font-medium text-accent hover:underline"
                                >
                                  {l.href}
                                </a>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="rounded-full p-2 text-mute hover:bg-card hover:text-ink cursor-pointer"
                                  title="Copy link"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(l.href);
                                    void triggerHaptic("light");
                                    toast.success("Link copied");
                                  }}
                                >
                                  <Copy size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full p-2 text-mute hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                  title="Remove link"
                                  onClick={() => {
                                    const next = links.filter((x) => x.id !== l.id);
                                    setLinks(next);
                                    void updateProfile({ handle: activeProfile.handle, links: next })
                                      .then(() => {
                                        void triggerHaptic("light");
                                        toast.success("Link removed");
                                      })
                                      .catch((err) =>
                                        toast.error(
                                          err instanceof Error ? err.message : "Could not update your account",
                                        ),
                                      );
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* TAB 3: SHOP & CATALOG */}
            {tab === "shop" && (
              <div className="mt-6 rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs">
                <div className="mb-4 pb-3 border-b border-line/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                    <Package size={14} />
                    <span>{isBusiness ? "Business Menu, Deals & Products" : "Bio Recommendations & Deals"}</span>
                  </p>
                  <p className="text-xs text-mute mt-1">
                    {isBusiness
                      ? "Add signature dishes, happy hour deals, or bookable services customers can browse directly."
                      : "Add recommendations, affiliate perks, or services you offer."}
                  </p>
                </div>
                <BioCatalogEditor products={products} services={services} deals={deals} onChange={saveCatalog} />
              </div>
            )}

            {/* TAB 4: SHARE, PASSBOOK & QR */}
            {tab === "share" && (
              <div className="mt-6 space-y-6">
                {/* Apple Passbook Style QR Card */}
                <div className="rounded-3xl border border-line bg-card p-6 sm:p-8 text-center shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <QrCode size={14} />
                      <span>{isBusiness ? "Place QR & Digital Pass" : "AirPal Digital Bio Pass"}</span>
                    </p>
                    <span className="text-xs font-mono text-mute">{tapsToday(activeProfile.handle)} taps today</span>
                  </div>

                  {qr && (
                    <div className="relative inline-block rounded-3xl bg-white p-5 ring-1 ring-line shadow-clay transition hover:scale-[1.01]">
                      <img
                        src={qr}
                        alt={`QR code for @${activeProfile.handle}`}
                        className="mx-auto h-52 w-52 sm:h-60 sm:w-60"
                      />
                    </div>
                  )}

                  <div>
                    <p className="font-display text-2xl font-bold tracking-tight text-ink">
                      airpal.me/@{activeProfile.handle}
                    </p>
                    <p className="text-xs text-mute mt-1">
                      Scan or tap to open directly in browser or verified Apple/Google Wallet.
                    </p>
                  </div>

                  {/* Australian Air Zoo Collectible Sticker Toggle */}
                  <label className="mx-auto flex max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-paper p-3 text-xs font-medium border border-line cursor-pointer hover:border-brand/30 transition">
                    <input
                      type="checkbox"
                      checked={zooHunt}
                      onChange={(e) => setZooHunt(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-brand"
                    />
                    <span>Air Zoo Hunt — display collectible Aussie sticker on pass</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 max-w-md mx-auto">
                    <Button
                      className={cn(
                        "h-12 font-semibold gap-2 shadow-sm rounded-2xl cursor-pointer",
                        isBusiness && "bg-amber-600 hover:bg-amber-700 text-white",
                      )}
                      onClick={() => {
                        void triggerHaptic("medium");
                        if (navigator.share) {
                          navigator
                            .share({
                              title: `${activeProfile.name} (@${activeProfile.handle})`,
                              text: activeProfile.shortWhy || "Connect on AirPal",
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
                      className="h-12 font-semibold border border-line bg-paper hover:bg-card gap-2 rounded-2xl cursor-pointer"
                      onClick={() => {
                        void navigator.clipboard.writeText(share);
                        void triggerHaptic("light");
                        toast.success("Profile URL copied to clipboard");
                      }}
                    >
                      <Copy size={16} />
                      <span>Copy URL</span>
                    </Button>
                  </div>

                  {qr && (
                    <div className="pt-2">
                      <a
                        href={qr}
                        download={`airpal-${activeProfile.handle}-qr.png`}
                        onClick={() => void triggerHaptic("light")}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold text-accent hover:bg-brand/5 transition"
                      >
                        <Download size={14} />
                        <span>Download High-Res QR Code Image</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Handle Configuration */}
                <div className="rounded-3xl border border-line bg-card p-6 sm:p-7 shadow-xs">
                  <ChangeHandleForm current={activeProfile.handle} profileId={activeProfile.id} />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Realistic Phone Mockup (Desktop / Tablet lg+) */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
                  <Smartphone size={14} className="text-accent" />
                  <span>Real-Time Visitor Preview</span>
                </p>
                <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Live Mirror
                </span>
              </div>
              {renderLivePhoneMockup()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Live Preview Drawer Sheet Modal (< lg screen) */}
      {mobilePreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live Profile Preview"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        >
          <div className="relative max-h-[92vh] overflow-y-auto rounded-t-[36px] bg-paper p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line/80" />

            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Eye size={14} /> Real-Time Live Profile Preview
              </span>
              <button
                type="button"
                className="rounded-full p-2 text-mute hover:bg-card hover:text-ink cursor-pointer"
                onClick={() => setMobilePreviewOpen(false)}
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-2">{renderLivePhoneMockup()}</div>

            <Button
              className="mt-4 w-full h-12 font-semibold rounded-2xl cursor-pointer"
              onClick={() => setMobilePreviewOpen(false)}
            >
              Done Previewing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
