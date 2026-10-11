import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  ContactRound,
  Copy,
  DoorOpen,
  Dumbbell,
  Edit3,
  Globe,
  HeartHandshake,
  KeyRound,
  Luggage,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  PhoneCall,
  QrCode,
  Share2,
  Shirt,
  Sparkles,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  Utensils,
  Video,
  Waves,
  Wifi,
  Wine,
  X,
} from "lucide-react";
import type { BioCatalogItem } from "@shared/bio";
import { BUSINESS_CATEGORIES } from "@shared/business";
import { CURRENT_PROPERTY } from "@shared/airpal-data";
import { getCachedProperty } from "@/lib/properties";
import { FollowButton, LikeButton } from "@/components/social/SocialButtons";
import { openVCardContact, upsertPerson } from "@/lib/people";
import { BrandMark } from "@/components/brand/BrandMark";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { BioSocials } from "@/components/bio/BioSocials";
import { BioCatalogSection } from "@/components/bio/BioCatalog";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { CatchUpSlotActions } from "@/components/bio/CatchUpSlotActions";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { BioPulseRate } from "@/components/bio/BioPulseRate";
import { BioKindIcon } from "@/components/bio/BioKindBadge";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { AirPalChatModal } from "@/components/messaging/AirPalChatModal";
import { createConversationRecord } from "@/lib/chat-store";
import { inviteLinkFor } from "@/lib/app-invites";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import type { UniversalConversation } from "@shared/messaging";
import {
  listCatchUpsForHandle,
  subscribeCatchUpsForOwner,
  updateCatchUpStatus,
  hasCatchUpReminder,
  toggleCatchUpReminder,
  type CatchUpItem,
} from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { canViewProfile, completedExperiencesCount } from "@/lib/profile-stats";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { usePlans } from "@/contexts/PlanContext";
import { fetchPublicBio } from "@/lib/bio-store";
import { TradingHoursScheduleView } from "@/components/discovery/TradingHoursScheduleView";
import { resolvePublicBio } from "@/lib/bio-handle";
import { claimCode, loadClaim, saveClaim } from "@/lib/bio-claims";
import { liveBackendEnabled, claimBioOfferRemote, joinGuestlistSignupRemote } from "@/lib/functions";
import { CITY_OPTIONS } from "@/lib/cities";
import { ensureAnonymousSession } from "@/lib/firebase";
import {
  GUESTLIST_CONSENT_V1,
  GUESTLIST_INTERESTS,
  validateGuestlistSignup,
  type GuestlistInterest,
} from "@shared/airpal-guestlist";
import { track, trackMapClick } from "@/lib/analytics";
import { setShareMeta } from "@/lib/share-meta";
import {
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  BIO_PUBLIC_PATH,
  bioPath,
  catalogDeals,
  isSafeBioHref,
  normalizeHandle,
  parseAtHandle,
  socialLinks,
  stackLinks,
} from "@shared/bio";
import type { PlanType, HangoutPlan } from "@shared/plan";
import { mapsPlaceIdUrl, mapsPlaceUrl } from "@/lib/maps";
import { toPublicUrl } from "@/lib/public-origin";
import { NotFoundPage } from "./NotFoundPage";
import { cn } from "@/lib/cn";
import { useClub } from "@/contexts/ClubContext";
import { PingButton } from "@/components/social/PingButton";
import { PlanGridCard } from "@/components/airpal/PlanGridCard";
import { triggerHaptic } from "@/lib/native";

/** Round action circle button with brand icon and subtitle */
function BizCircle({
  label,
  Icon,
  href,
  onClick,
}: {
  label: string;
  Icon: typeof Phone;
  href?: string;
  onClick?: () => void;
}) {
  const circle =
    "grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl sm:rounded-full bg-card text-accent ring-1 ring-line/80 shadow-xs transition-shadow duration-150 hover:shadow-md active:scale-95";
  const wrap = "flex min-w-[56px] sm:min-w-[64px] touch-manipulation flex-col items-center gap-1.5 group";
  const caption = "text-[11px] sm:text-xs font-semibold text-ink/90 group-hover:text-accent transition-colors";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={wrap} aria-label={label}>
        <span className={circle}>
          <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
        </span>
        <span className={caption}>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={wrap} aria-label={label}>
      <span className={circle}>
        <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
      </span>
      <span className={caption}>{label}</span>
    </button>
  );
}

/** Dynamic Lucide icon resolution for hotel & venue facilities */
function FacilityIcon({ name, icon }: { name: string; icon?: string }) {
  const norm = `${icon || ""} ${name || ""}`.toLowerCase();
  if (norm.includes("pool") || norm.includes("waves") || norm.includes("swim")) {
    return <Waves size={18} className="text-sky-500" />;
  }
  if (norm.includes("gym") || norm.includes("fitness") || norm.includes("dumbbell") || norm.includes("workout")) {
    return <Dumbbell size={18} className="text-amber-500" />;
  }
  if (norm.includes("bar") || norm.includes("wine") || norm.includes("cocktail") || norm.includes("drink")) {
    return <Wine size={18} className="text-rose-500" />;
  }
  if (norm.includes("luggage") || norm.includes("bag") || norm.includes("storage")) {
    return <Luggage size={18} className="text-emerald-500" />;
  }
  if (norm.includes("laundry") || norm.includes("shirt") || norm.includes("clean") || norm.includes("wash")) {
    return <Shirt size={18} className="text-indigo-500" />;
  }
  if (
    norm.includes("dining") ||
    norm.includes("food") ||
    norm.includes("restaurant") ||
    norm.includes("eat") ||
    norm.includes("breakfast")
  ) {
    return <Utensils size={18} className="text-orange-500" />;
  }
  if (norm.includes("wifi") || norm.includes("internet")) {
    return <Wifi size={18} className="text-cyan-500" />;
  }
  if (norm.includes("coffee") || norm.includes("cafe")) {
    return <Coffee size={18} className="text-amber-600" />;
  }
  if (norm.includes("spa") || norm.includes("sauna") || norm.includes("massage") || norm.includes("wellness")) {
    return <Sparkles size={18} className="text-fuchsia-500" />;
  }
  return <Building2 size={18} className="text-accent" />;
}

export function BioPublicPage() {
  const [path, nav] = useLocation();
  const [, params] = useRoute(BIO_PUBLIC_PATH);
  const handle = normalizeHandle(params?.handle || params?.[0] || parseAtHandle(path) || "");
  const { user, requireUser } = useAuth();
  const { plans } = usePlans();
  const { byHandle, recordTap, mine } = useBio();
  const { addGuest, joinClub } = useClub();
  const [listEmail, setListEmail] = useState("");
  const [listName, setListName] = useState("");
  const [listCity, setListCity] = useState("");
  const [listCityOther, setListCityOther] = useState("");
  const [listInterests, setListInterests] = useState<GuestlistInterest[]>([]);
  const [listSending, setListSending] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [catchUpInitialType, setCatchUpInitialType] = useState<PlanType>("catchup");
  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState<UniversalConversation | null>(null);
  const { stalls, getEvent } = useEvents();
  const { isFollowing, followerHandles } = useSocial();
  const local = resolvePublicBio(handle, byHandle);
  const [remote, setRemote] = useState<typeof local>();
  const [tried, setTried] = useState(!handle);
  const [claim, setClaim] = useState<{ code: string; badge: string; detail: string } | null>(null);
  const viewed = useRef("");

  const userPlans: HangoutPlan[] = useMemo(() => {
    const target = remote || local;
    if (!target) return [];
    const h = target.handle.toLowerCase();
    return plans.filter(
      (p) =>
        p.isPublic &&
        p.status !== "cancelled" &&
        ((p.creator?.handle && p.creator.handle.toLowerCase() === h) ||
          (target.ownerUid && p.creator?.uid === target.ownerUid)),
    );
  }, [plans, remote, local]);

  const completedCount = useMemo(() => {
    const target = remote || local;
    if (!target) return 0;
    return completedExperiencesCount(plans, { uid: target.ownerUid, handle: target.handle });
  }, [plans, remote, local]);

  useEffect(() => {
    const p = remote || local;
    if (!p || !user) {
      setCatchUpsList(p ? listCatchUpsForHandle(p.handle) : []);
      return;
    }
    const owner = Boolean(
      (p.ownerUid && p.ownerUid === user.uid) ||
      (p.ownerEmail && p.ownerEmail === user.email) ||
      (mine && mine.handle === p.handle),
    );
    if (!owner) return;
    if (p.ownerUid) return subscribeCatchUpsForOwner(p.ownerUid, setCatchUpsList);
    setCatchUpsList(listCatchUpsForHandle(p.handle));
  }, [remote, local, user, mine]);

  useEffect(() => {
    let live = true;
    setRemote(undefined);
    if (!handle) {
      setTried(true);
      return;
    }
    setTried(false);
    void fetchPublicBio(handle)
      .then((row) => {
        if (!live) return;
        if (row) setRemote(row);
        setTried(true);
      })
      .catch(() => {
        if (live) setTried(true);
      });
    return () => {
      live = false;
    };
  }, [handle]);

  useEffect(() => {
    if (!claim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClaim(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [claim]);

  const profile = remote || local;
  const [bioQrUrl, setBioQrUrl] = useState<string>("");

  useEffect(() => {
    if (!profile?.handle) return;
    let live = true;
    void makeQrDataUrl(toPublicUrl(bioPath(profile.handle)), 320).then((data) => {
      if (live) setBioQrUrl(data);
    });
    return () => {
      live = false;
    };
  }, [profile?.handle]);

  const loadFailed = useRef("");

  useEffect(() => {
    if (!tried || profile || !handle || loadFailed.current === handle) return;
    loadFailed.current = handle;
    void track("context_load_failed", { contextType: "bio", contextId: handle, errorClass: "not_found" });
  }, [tried, profile, handle]);

  useEffect(() => {
    if (!profile) return;
    if (viewed.current === profile.handle) return;
    viewed.current = profile.handle;
    recordTap(profile.handle, "view");

    let shareImg = profile.cover || profile.avatar;
    if (shareImg && shareImg.startsWith("idb:")) {
      shareImg = undefined;
    }
    if (!shareImg) {
      shareImg = "https://airpal.me/brand/og-share.jpg";
    }

    const bioDescription =
      profile.shortWhy ||
      profile.offer?.detail ||
      profile.customStatus ||
      `Connect with ${profile.name} (@${profile.handle}) on AirPal.Me — Life Made Easy.`;

    setShareMeta({
      title: `${profile.name} (@${profile.handle}) · AirPal.Me`,
      description: bioDescription.slice(0, 160),
      image: shareImg,
      url: toPublicUrl(bioPath(profile.handle)),
      type: "profile",
      imageAlt: `${profile.name} on AirPal.Me`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: profile.name,
          alternateName: `@${profile.handle}`,
          description: bioDescription,
          image: shareImg ? (shareImg.startsWith("http") ? shareImg : toPublicUrl(shareImg)) : undefined,
          url: toPublicUrl(bioPath(profile.handle)),
        },
      },
    });
  }, [profile, recordTap]);

  const propertyData = useMemo(() => {
    const target = remote || local;
    if (!target) return undefined;
    if (target.propertyId) return getCachedProperty(target.propertyId);
    if (target.handle === "harbour-hotel" || target.handle === "harbour-rocks-hotel") return CURRENT_PROPERTY;
    return getCachedProperty(target.handle);
  }, [remote, local]);

  const isStay = Boolean(
    profile &&
    (profile.category === "stay" ||
      Boolean(profile.propertyId) ||
      Boolean(propertyData) ||
      (profile.categoryTag && /stay|hotel|accommodation|hostel|resort|lodge|motel|inn/i.test(profile.categoryTag)) ||
      (profile.facilities && profile.facilities.length > 0)),
  );

  // Harbour demo facilities come from CURRENT_PROPERTY via propertyData — never invent them for other stays.
  const stayFacilities = useMemo(() => {
    if (!profile) return [];
    if (profile.facilities && profile.facilities.length > 0) return profile.facilities;
    if (propertyData?.facilities && propertyData.facilities.length > 0) return propertyData.facilities;
    return [];
  }, [profile, propertyData]);

  if (!profile && !tried) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8" aria-label="Loading profile" role="status">
        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-line/70 shadow-xs">
          <div className="h-44 w-full motion-safe:animate-pulse bg-paper sm:h-52" />
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="-mt-14 h-24 w-24 sm:h-28 sm:w-28 motion-safe:animate-pulse rounded-full bg-paper ring-4 ring-card shadow-md" />
              <div className="mb-1 h-8 w-24 motion-safe:animate-pulse rounded-full bg-paper" />
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="h-7 w-48 motion-safe:animate-pulse rounded-lg bg-paper" />
              <div className="h-4 w-24 motion-safe:animate-pulse rounded-md bg-paper" />
              <div className="h-4 w-full motion-safe:animate-pulse rounded-md bg-paper" />
              <div className="h-4 w-3/4 motion-safe:animate-pulse rounded-md bg-paper" />
            </div>
            <div className="mt-5 flex gap-2">
              <div className="h-10 flex-1 motion-safe:animate-pulse rounded-full bg-paper" />
              <div className="h-10 flex-1 motion-safe:animate-pulse rounded-full bg-paper" />
              <div className="h-10 w-16 motion-safe:animate-pulse rounded-full bg-paper" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile && tried) {
    if (handle) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="rounded-[32px] border border-line bg-card p-6 sm:p-8 shadow-clay">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-accent shadow-inner">
              <Sparkles size={32} />
            </div>
            <h1 className="font-display mt-5 text-2xl sm:text-3xl font-bold text-ink">@{handle} is available!</h1>
            <p className="mt-2.5 text-sm text-mute leading-relaxed">
              This AirPal handle hasn’t been set up yet. Be the first to claim <strong>@{handle}</strong> and launch
              your public bio page.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                size="lg"
                className="w-full gap-2 rounded-full bg-brand font-semibold text-white shadow-md hover:bg-brand-ink"
                onClick={() => nav(`/bio/setup?handle=${handle}`)}
              >
                Claim @{handle}
              </Button>
              <Button variant="ghost" className="w-full rounded-full" onClick={() => nav("/")}>
                Explore AirPal
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <NotFoundPage />;
  }

  if (!profile) return <NotFoundPage />;
  const bio = profile;

  const isOwner = Boolean(
    (user && bio.ownerUid && bio.ownerUid === user.uid) ||
    (user && bio.ownerEmail && bio.ownerEmail === user.email) ||
    (mine && mine.handle === bio.handle),
  );

  const viewer = user
    ? { uid: user.uid, email: user.email || undefined, handle: mine?.handle }
    : null;
  const canView =
    isStay ||
    canViewProfile(viewer, bio, {
      isFollowing: (h) => isFollowing(h),
      isFollower: (h) => followerHandles.has(h.trim().toLowerCase().replace(/^@/, "")),
    });

  if (!canView) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-[32px] border border-line bg-card p-6 sm:p-8 shadow-clay">
          <h1 className="font-display mt-2 text-2xl font-bold text-ink">{bio.name}</h1>
          <p className="mt-1 text-sm font-medium text-mute">@{bio.handle}</p>
          <p className="mt-3 text-sm text-mute leading-relaxed">
            {bio.visibility === "private"
              ? "This profile is private."
              : "This profile is visible to friends. Follow to view it."}
          </p>
          {bio.visibility !== "private" && (
            <div className="mt-6">
              <FollowButton handle={bio.handle} name={bio.name} className="w-full" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const appearing = stalls.filter((s) => s.handle === bio.handle && s.status === "active");
  const unclaimed =
    !isOwner &&
    !bio.ownerUid &&
    (bio.id.startsWith("place-") || bio.id.startsWith("stall-") || bio.id.startsWith("bio-"));

  const maps = bio.mapsPlaceId
    ? mapsPlaceIdUrl(bio.mapsPlaceId)
    : bio.geo
      ? mapsPlaceUrl(bio.geo, bio.name)
      : bio.links.find((l) => l.type === "maps")?.href;

  async function onClaimDeal(item: BioCatalogItem) {
    recordTap(bio.handle, "deal");
    const existing = loadClaim(bio.handle, item.id);
    if (existing) {
      setClaim(existing);
      return;
    }
    try {
      if (liveBackendEnabled()) {
        const row = await claimBioOfferRemote({ handle: bio.handle, dealId: item.id });
        const saved = saveClaim({ handle: bio.handle, dealId: item.id, ...row });
        setClaim(saved);
        void track("offer_claim", {
          offerId: item.id,
          partnerId: bio.handle,
          claimId: `${bio.handle}_${item.id}`,
          contextId: bio.handle,
        });
        return;
      }
    } catch {
      /* local code */
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const saved = saveClaim({
      handle: bio.handle,
      dealId: item.id,
      code: claimCode(),
      badge: item.badge || item.title,
      detail: item.detail,
      expiresAt,
    });
    setClaim(saved);
    void track("offer_claim", {
      offerId: item.id,
      partnerId: bio.handle,
      claimId: `${bio.handle}_${item.id}`,
      contextId: bio.handle,
    });
  }

  // Website URL resolution
  const websiteLink = bio.links.find(
    (l) => l.type === "website" || l.type === "book" || l.type === "order" || l.type === "menu",
  );
  const rawWebsite = (bio as Record<string, unknown>).website;
  const websiteFallback =
    typeof rawWebsite === "string" && rawWebsite.trim()
      ? rawWebsite.startsWith("http")
        ? rawWebsite.trim()
        : `https://${rawWebsite.trim()}`
      : undefined;
  const websiteUrl =
    websiteLink?.href ||
    (bio.domain ? (bio.domain.startsWith("http") ? bio.domain : `https://${bio.domain}`) : undefined) ||
    websiteFallback;

  // WhatsApp URL resolution
  const whatsappLink = bio.links.find((l) => l.type === "whatsapp");
  const whatsappUrl =
    whatsappLink?.href || (bio.phone ? `https://wa.me/${bio.phone.replace(/[^0-9]/g, "")}` : undefined);

  // Call / tel resolution
  const callLink = bio.links.find((l) => l.type === "call");
  const tel = bio.phone ? `tel:${bio.phone.replace(/\s/g, "")}` : callLink?.href;

  const share = toPublicUrl(bioPath(bio.handle));
  const stacked = stackLinks(bio.links).filter((l) => l.href !== websiteUrl && l.type !== "whatsapp");
  const avatar = bio.avatar && bio.avatar !== bio.cover ? bio.avatar : undefined;

  const deals = catalogDeals(bio);
  const liveOffer = bio.offer?.badge
    ? { badge: bio.offer.badge, detail: bio.offer.detail, title: bio.offer.badge }
    : deals.length > 0
      ? { badge: deals[0].badge || "Special Offer", detail: deals[0].detail, title: deals[0].title }
      : null;

  const statusKey: AvailabilityStatus =
    bio.availabilityStatus || (bio.openNow === true ? "available" : bio.openNow === false ? "offline" : "available");
  const statusInfo = AVAILABILITY_STATUSES[statusKey] || AVAILABILITY_STATUSES.available;

  const stayCheckIn = bio.checkIn || propertyData?.checkIn || "2:00 PM";
  const stayCheckOut = bio.checkOut || propertyData?.checkOut || "10:00 AM";
  const stayWifiSpeed = propertyData?.wifi?.speed || "250 Mbps High-Speed Fibre";
  const stayTargetId = propertyData?.id || bio.propertyId || bio.handle;

  const handleQuickCopy = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(share);
      setCopiedLink(true);
      toast.success("Profile link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.message(share);
    }
  };

  const handleCopyInviteCode = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(`@${bio.handle}`);
      setCopiedCode(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.message(`@${bio.handle}`);
    }
  };

  const handleShareInvite = async () => {
    void triggerHaptic("light");
    const url = inviteLinkFor(bio.handle);
    const text = `Join me on AirPal — use my code @${bio.handle}.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Join ${bio.name} on AirPal`, text, url });
        return;
      } catch {
        /* user dismissed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Invite link copied!");
    } catch {
      toast.message(url);
    }
  };

  const handleStartChat = () => {
    void triggerHaptic("light");
    const currentUid = user?.uid || "guest_user";
    let convType: UniversalConversation["type"] = "direct";
    let targetId = bio.handle;

    if (isStay) {
      convType = "stay";
      targetId = stayTargetId;
    } else if (bio.kind === "business") {
      convType = "business";
      targetId = bio.handle;
    } else {
      convType = "direct";
      targetId = bio.ownerUid || bio.handle;
    }

    const conv = createConversationRecord({
      type: convType,
      targetId,
      title: bio.name,
      photo: avatar || bio.cover,
      userUid: currentUid,
      userName: user?.displayName || "Guest",
      userPhoto: user?.photoURL || undefined,
      peerUid: targetId,
      peerName: bio.name,
      peerPhoto: avatar || bio.cover,
    });

    setChatConversation(conv);
    setChatModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-2xl pb-20 pb-safe sm:py-6">
      {isOwner && (
        <div className="mb-3 mx-3 sm:mx-0 flex items-center justify-between gap-3 rounded-2xl bg-brand/10 p-3 ring-1 ring-brand/25 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <UserRound size={16} className="text-accent shrink-0" />
            <p className="text-xs font-semibold text-ink truncate">
              Public Bio view · Your appointments, tickets &amp; schedule live in Me
            </p>
          </div>
          <button
            type="button"
            onClick={() => nav("/me")}
            className="shrink-0 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-brand px-3.5 py-1 text-xs font-bold text-white transition hover:bg-brand-ink active:scale-95 shadow-2xs cursor-pointer"
          >
            <span>Open Me</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Main Glass Card Wrapper */}
      <div className="overflow-hidden bg-card/95 sm:rounded-[36px] sm:ring-1 sm:ring-line/80 sm:shadow-clay backdrop-blur-xl">
        {/* Cover Hero Header */}
        <div className="relative overflow-hidden">
          {bio.cover ? (
            <Photo src={bio.cover} className="h-48 w-full object-cover sm:h-60" />
          ) : (
            <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#121829] via-[#1c2438] to-[#0f1424] sm:h-60">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#1805db_1.5px,transparent_1.5px)] [background-size:20px_20px]" />
            </div>
          )}

          {/* Top Floating Glass Navigation Dock */}
          <div className="absolute inset-x-3.5 top-3.5 z-10 flex items-center justify-between">
            {/* Left Pill: Back & AirPal Logo */}
            <div className="inline-flex items-center rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-black/10 backdrop-blur-md">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    nav("/");
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink/75 transition hover:bg-black/5 hover:text-ink active:scale-95"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="mx-0.5 h-3.5 w-[1px] bg-line" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nav("/");
                }}
                className="flex h-11 items-center rounded-full px-3 transition hover:bg-black/5 active:scale-95"
                aria-label="AirPal Home"
                title="AirPal Home"
              >
                <BrandMark compact />
              </button>
            </div>

            {/* Right Controls: Quick Copy Link & Handle Badge */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleQuickCopy}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-semibold text-ink shadow-sm ring-1 ring-black/10 backdrop-blur-md transition hover:bg-white active:scale-95"
                title="Copy profile link"
                aria-label="Copy profile link"
              >
                {copiedLink ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-mute" />
                    <span className="hidden xs:inline">Share</span>
                  </>
                )}
              </button>
              <BioHandleButton handle={bio.handle} className="shadow-sm" />
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="px-5 pb-8 sm:px-8">
          {/* Avatar & Action Button Row */}
          <div className="flex items-end justify-between">
            {/* Avatar with Status Glow Ring & Kind Icon */}
            <div className="relative">
              <div
                className={cn(
                  "-mt-14 sm:-mt-16 relative z-10 h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full bg-paper ring-4 ring-card transition-all duration-300 shadow-md",
                  statusKey === "available" ? "ring-offset-2 ring-offset-emerald-500/30" : "",
                )}
              >
                {avatar ? (
                  <Photo src={avatar} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-neutral-900 font-display text-3xl font-bold text-white">
                    {bio.name[0]}
                  </span>
                )}
              </div>

              {/* Status Pulse Indicator */}
              <span
                className={cn(
                  "absolute bottom-0 right-0 z-20 h-5 w-5 rounded-full ring-2 ring-card shadow-sm grid place-items-center",
                  statusKey === "available" ? "bg-emerald-500" : statusKey === "busy" ? "bg-amber-500" : "bg-zinc-400",
                )}
                title={statusInfo.label}
              >
                {statusKey === "available" && (
                  <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                )}
                <BioKindIcon kind={bio.kind} className="h-5 w-5 ring-0" />
              </span>
            </div>

            {/* Profile Action Pill (Edit, Claim, Connect) */}
            <div className="mb-1 flex items-center gap-2">
              {isOwner ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 cursor-pointer"
                    onClick={() => nav("/me")}
                  >
                    <UserRound size={13} />
                    Me Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full border border-line bg-paper/80 px-3 text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95"
                    onClick={() => nav("/bio/edit")}
                  >
                    <Edit3 size={13} />
                    Edit
                  </Button>
                </div>
              ) : unclaimed ? (
                <Button
                  size="sm"
                  className="rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink active:scale-95"
                  onClick={() =>
                    nav(`/bio/setup?handle=${bio.handle}${bio.kind === "business" || isStay ? "&kind=business" : ""}`)
                  }
                  title={
                    bio.kind === "business" || isStay
                      ? "Claim this place as its owner — business verification applies"
                      : `Claim @${bio.handle} as your AirPal Me handle`
                  }
                >
                  Claim @{bio.handle}
                </Button>
              ) : bio.kind === "person" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink active:scale-95"
                    onClick={() => {
                      if (!requireUser("Sign in to keep the people you meet in one place.")) return;
                      upsertPerson({
                        handle: bio.handle,
                        name: bio.name,
                        photo: avatar,
                        whereMet: bio.city || undefined,
                      });
                      toast.success(`${bio.name} saved to people you met`);
                    }}
                  >
                    <UserPlus size={14} />
                    Connect
                  </Button>
                  {bio.ownerUid && (!user || bio.ownerUid !== user.uid) && (
                    <PingButton toUid={bio.ownerUid} toHandle={bio.handle} toName={bio.name} />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full border border-line bg-paper/80 px-3 text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95"
                    aria-label={`Save ${bio.name} to phone contacts`}
                    title="Save contact to phone (.vcf)"
                    onClick={() => {
                      void openVCardContact({
                        name: bio.name,
                        phone: bio.phone,
                        url: share,
                        note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                      });
                    }}
                  >
                    <ContactRound size={14} className="text-accent" />
                    <span className="hidden sm:inline">Save Contact</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-paper/80 px-3 text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95"
                  aria-label={`Save ${bio.name} to phone contacts`}
                  title="Save contact to phone (.vcf)"
                  onClick={() => {
                    void openVCardContact({
                      name: bio.name,
                      phone: bio.phone,
                      url: share,
                      note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                    });
                  }}
                >
                  <ContactRound size={14} className="text-accent" />
                  <span>Save Contact</span>
                </Button>
              )}
            </div>
          </div>

          {/* Profile Name & Primary Identity */}
          <div className="mt-3.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">{bio.name}</h1>
              {bio.categoryTag && (
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                  {bio.categoryTag}
                </span>
              )}
              {bio.kind === "person" && bio.starTier && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent"
                  title={`AirPal ${bio.starTier} — earned by bringing mates to real experiences`}
                >
                  <span aria-hidden>★</span> {bio.starTier}
                </span>
              )}
              {bio.kind === "person" && (
                <Link
                  href="/pass"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/25 hover:bg-amber-500/20 transition"
                  title="AirPal Passholder — access to events, cultural festivals & perks"
                >
                  <Ticket size={11} className="text-amber-500" /> Passholder
                </Link>
              )}
            </div>

            {/* Handle & Subtitle */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-mute">
              <span className="font-semibold text-ink/75">@{bio.handle}</span>
              {bio.pronouns && <span>· {bio.pronouns}</span>}
              {bio.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-accent shrink-0" aria-hidden />
                  {bio.city}
                </span>
              )}
              {(bio.kind === "business" || isStay) && bio.category && (
                <span>
                  ·{" "}
                  {bio.category === "stay"
                    ? "Stay & Accommodation"
                    : BUSINESS_CATEGORIES.find((c) => c.id === bio.category)?.label || "Business"}
                </span>
              )}
              {bio.languages && <span>· {bio.languages}</span>}
            </div>
            {bio.kind === "person" && completedCount > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-ink">
                {completedCount} completed {completedCount === 1 ? "experience" : "experiences"}
              </p>
            )}

            {/* Interactive Availability / Custom Status Pill */}
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => isOwner && setStatusModalOpen(true)}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-xs font-semibold border transition-all duration-200 shadow-2xs",
                  statusInfo.badgeBg,
                  statusInfo.textColor,
                  isOwner ? "cursor-pointer hover:brightness-95 active:scale-95" : "cursor-default",
                )}
                title={isOwner ? "Click to change status" : statusInfo.description}
              >
                <span className="h-2 w-2 rounded-full bg-current shrink-0" />
                {bio.customStatus ? (
                  <span className="font-bold text-ink truncate max-w-[320px] sm:max-w-md">
                    {bio.customStatusEmoji && `${bio.customStatusEmoji} `}
                    {bio.customStatus}
                  </span>
                ) : (
                  <span className="font-bold">{statusInfo.label}</span>
                )}
                {isOwner && <Edit3 size={11} className="opacity-60 ml-0.5" />}
              </button>
            </div>

            {/* Elevator Pitch / Short Why */}
            {bio.shortWhy &&
              bio.shortWhy.trim().toLowerCase() !== bio.customStatus?.trim().toLowerCase() &&
              bio.shortWhy.trim().toLowerCase() !==
                `${bio.customStatusEmoji || ""} ${bio.customStatus || ""}`.trim().toLowerCase() && (
                <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-ink/85 font-normal">
                  {bio.shortWhy}
                </p>
              )}

            {/* Extended About Story Card */}
            {bio.aboutText && (
              <div
                id="bio-about"
                className="mt-4 scroll-mt-24 rounded-3xl bg-paper/60 p-4 sm:p-5 border border-line/80 shadow-2xs"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">About Story</p>
                <p className="text-xs sm:text-sm leading-relaxed text-ink/80 whitespace-pre-line">{bio.aboutText}</p>
              </div>
            )}
          </div>

          {/* Social Engagement Deck (Follow, Like, Website, QR Share) */}
          <div className="mt-5 flex items-center gap-2">
            <FollowButton handle={bio.handle} name={bio.name} className="flex-1 min-w-0 h-10 text-xs font-semibold px-2.5 sm:px-4" />
            <LikeButton handle={bio.handle} name={bio.name} className="flex-1 min-w-0 h-10 text-xs font-semibold px-2.5 sm:px-4" />
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => recordTap(bio.handle, websiteLink?.type || "website")}
                className="inline-flex h-10 items-center justify-center rounded-full bg-paper px-3 sm:px-3.5 text-xs font-semibold text-ink shadow-2xs ring-1 ring-line/80 transition hover:bg-paper/80 active:scale-95 shrink-0"
                title={`Visit ${bio.domain || "website"}`}
                aria-label="Website"
              >
                <span>www</span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-paper px-3 sm:px-4 text-xs font-semibold text-ink shadow-2xs ring-1 ring-line/80 transition hover:bg-paper/80 active:scale-95 shrink-0"
              title="Share & QR Code"
            >
              <QrCode size={15} className="text-accent" />
              <span>QR</span>
            </button>
          </div>

          {/* 1-Tap Quick Action Deck: [Chat], [WhatsApp], [Call] */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleStartChat}
              className="group flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand/10 px-2 text-xs font-bold text-accent ring-1 ring-brand/30 transition-all duration-200 hover:bg-brand hover:text-white active:scale-95 shadow-2xs"
            >
              <MessageSquare size={15} className="shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate">Chat</span>
            </button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => recordTap(bio.handle, "whatsapp")}
                className="group flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-paper/70 px-2 text-xs font-semibold text-ink ring-1 ring-line/80 transition-all duration-200 hover:bg-paper hover:ring-emerald-500/40 active:scale-95 shadow-2xs"
              >
                <MessageCircle
                  size={15}
                  className="text-emerald-600 shrink-0 group-hover:scale-110 transition-transform"
                />
                <span className="truncate">WhatsApp</span>
              </a>
            ) : (
              <div className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-paper/30 px-2 text-xs font-medium text-mute/50 ring-1 ring-line/40 cursor-not-allowed">
                <MessageCircle size={15} className="opacity-40 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </div>
            )}

            {tel ? (
              <a
                href={tel}
                onClick={() => recordTap(bio.handle, "call")}
                className="group flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-paper/70 px-2 text-xs font-semibold text-ink ring-1 ring-line/80 transition-all duration-200 hover:bg-paper hover:ring-amber-500/40 active:scale-95 shadow-2xs"
              >
                <Phone size={15} className="text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Call</span>
              </a>
            ) : (
              <div className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-paper/30 px-2 text-xs font-medium text-mute/50 ring-1 ring-line/40 cursor-not-allowed">
                <Phone size={15} className="opacity-40 shrink-0" />
                <span className="truncate">Call</span>
              </div>
            )}
          </div>

          {/* 🪪 Digital ID · AirPal Bio Pass (QR + Apple & Google Wallet) */}
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-card via-card to-paper p-4 sm:p-5 ring-1 ring-line/80 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                <QrCode size={14} className="text-accent" />
                <span>AirPal Bio Pass · Digital ID</span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-mute">
                @{bio.handle}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div
                onClick={() => setShareModalOpen(true)}
                className="relative group cursor-pointer shrink-0 grid place-items-center h-32 w-32 rounded-2xl bg-white p-2 shadow-inner ring-1 ring-black/5 hover:ring-brand/50 transition-all duration-200"
                title="Click to enlarge or download QR Code"
              >
                {bioQrUrl ? (
                  <img src={bioQrUrl} alt={`QR Code for @${bio.handle}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="text-[10px] text-mute animate-pulse">Loading QR…</div>
                )}
                <span className="absolute inset-0 bg-brand/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                  <span className="text-[10px] font-bold bg-ink/80 text-white rounded-full px-2 py-0.5">Enlarge</span>
                </span>
              </div>

              <div className="flex-1 min-w-0 w-full space-y-2">
                <p className="text-xs text-mute leading-relaxed text-center sm:text-left">
                  Scan to view this profile instantly on any phone, or add to Apple Wallet &amp; Google Wallet as a digital contact pass.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <AppleWalletButton
                    className="w-full sm:w-auto flex-1 justify-center min-h-[40px]"
                    onClick={() => {
                      const passUrl = businessCardWalletPassUrl(bio.handle);
                      void openAppleWalletPass(passUrl, "@" + bio.handle + "-AirPal-Pass");
                    }}
                  />
                  <GoogleWalletButton
                    className="w-full sm:w-auto flex-1 justify-center min-h-[40px]"
                    onClick={() => {
                      void openGoogleWalletPass(googleWalletCardUrl(bio.handle));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 pt-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Share or Print QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-mute hover:text-ink cursor-pointer"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Business & Stay profile specific overview, facilities & actions */}
          {(bio.kind === "business" || isStay) && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">
                  <span className={cn(bio.openNow ? "text-emerald-600" : "text-red-500")}>
                    ● {bio.openNow ? "Open now" : "Closed"}
                  </span>
                  {bio.hours && <span className="text-mute font-normal"> · {bio.hours}</span>}
                </p>
                {isStay && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                    <Sparkles size={11} />
                    Verified Stay
                  </span>
                )}
              </div>

              {/* Section Tabs */}
              <div
                className="mt-3.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                role="navigation"
                aria-label="Business sections"
              >
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="min-h-[44px] shrink-0 rounded-full bg-neutral-900 px-4 text-xs font-semibold text-white transition active:scale-95"
                >
                  Overview
                </button>
                {isStay && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-stay")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-brand/10 px-4 text-xs font-bold text-accent ring-1 ring-brand/30 transition hover:bg-brand/15 active:scale-95"
                  >
                    Stay &amp; AI
                  </button>
                )}
                {isStay && stayFacilities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-facilities")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Facilities
                  </button>
                )}
                {liveOffer && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-offers")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Offers
                  </button>
                )}
                {(bio.products || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-products")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Products
                  </button>
                )}
                {(bio.services || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-services")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Services
                  </button>
                )}
                {bio.aboutText && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bio-about")?.scrollIntoView({ behavior: "smooth" })}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    About
                  </button>
                )}
              </div>

              {/* Action Circles */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar" aria-label="Contact actions">
                <BizCircle label="Chat" Icon={MessageSquare} onClick={handleStartChat} />
                {propertyData?.bookingUrl ? (
                  <BizCircle
                    label="Book Direct"
                    Icon={KeyRound}
                    href={propertyData.bookingUrl}
                    onClick={() => recordTap(bio.handle, "book")}
                  />
                ) : null}
                {tel && (
                  <BizCircle label="Call" Icon={Phone} href={tel} onClick={() => recordTap(bio.handle, "call")} />
                )}
                {maps && (
                  <BizCircle
                    label="Directions"
                    Icon={Navigation}
                    href={maps}
                    onClick={() => {
                      recordTap(bio.handle, "maps");
                      trackMapClick({ source: "bio" });
                    }}
                  />
                )}
                {websiteUrl && (
                  <BizCircle
                    label="Website"
                    Icon={Globe}
                    href={websiteUrl}
                    onClick={() => recordTap(bio.handle, websiteLink?.type || "website")}
                  />
                )}
                <BizCircle label="Share" Icon={Share2} onClick={() => setShareModalOpen(true)} />
                <BizCircle
                  label="Save"
                  Icon={ContactRound}
                  onClick={() => {
                    void openVCardContact({
                      name: bio.name,
                      phone: bio.phone,
                      url: share,
                      note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                    });
                  }}
                />
              </div>

              {/* Stay / Hotel Companion & Facilities Deck */}
              {isStay && (
                <div id="bio-stay" className="mt-5 scroll-mt-24 space-y-4">
                  {/* Stay & Guide hero banner */}
                  <div className="overflow-hidden rounded-3xl bg-card p-5 ring-1 ring-brand/30 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                        <Sparkles size={11} />
                        Stay &amp; Guide
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                        24/7 Live
                      </span>
                    </div>

                    <h3 className="font-display mt-2.5 text-lg sm:text-xl font-bold text-ink">
                      Room Companion &amp; 24/7 AirPal AI
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-mute leading-relaxed">
                      Everything for your stay in one scan: in-room dining, Wi-Fi 1-tap connect, room service, express
                      check-in/out, house rules, and 24/7 AI Receptionist.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Link
                        href={`/stay/${stayTargetId}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink active:scale-95"
                      >
                        <DoorOpen size={15} />
                        <span>Open Stay & Guide</span>
                      </Link>
                      <Link
                        href={`/stay/${stayTargetId}?open=answers`}
                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-xs font-bold text-ink ring-1 ring-line/80 shadow-2xs transition hover:bg-paper/80 active:scale-95"
                      >
                        <Sparkles size={14} className="text-accent" />
                        <span>Ask AirPal AI 24/7</span>
                      </Link>
                    </div>
                  </div>

                  {/* Stay Key Information & Policies Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-mute text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} className="text-accent" />
                        <span>Check-In</span>
                      </div>
                      <p className="mt-1 font-display text-sm sm:text-base font-bold text-ink">{stayCheckIn}</p>
                      <p className="text-[10px] text-mute mt-0.5">Digital keycard ready</p>
                    </div>

                    <div className="rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-mute text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} className="text-amber-600" />
                        <span>Check-Out</span>
                      </div>
                      <p className="mt-1 font-display text-sm sm:text-base font-bold text-ink">{stayCheckOut}</p>
                      <p className="text-[10px] text-mute mt-0.5">Express folio checkout</p>
                    </div>

                    <div className="rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-mute text-[10px] font-bold uppercase tracking-wider">
                        <Wifi size={12} className="text-cyan-600" />
                        <span>Guest Wi-Fi</span>
                      </div>
                      <p className="mt-1 font-display text-xs sm:text-sm font-bold text-ink truncate">Fibre Speed</p>
                      <p className="text-[10px] text-mute mt-0.5 truncate">{stayWifiSpeed}</p>
                    </div>

                    <div className="rounded-2xl bg-paper/70 p-3.5 ring-1 ring-line/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-mute text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles size={12} className="text-accent" />
                        <span>Front Desk</span>
                      </div>
                      <p className="mt-1 font-display text-xs sm:text-sm font-bold text-ink">24/7 AI &amp; Staff</p>
                      <p className="text-[10px] text-mute mt-0.5">Instant escalation</p>
                    </div>
                  </div>

                  {/* 🏢 Hotel Facilities & Amenities Grid */}
                  {stayFacilities.length > 0 && (
                    <div
                      id="bio-facilities"
                      className="scroll-mt-24 rounded-3xl bg-paper/60 p-5 ring-1 ring-line/80 shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-3.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                            🏢 Hotel Facilities
                          </span>
                          <h4 className="font-display text-base sm:text-lg font-bold text-ink mt-0.5">
                            Amenities &amp; Guest Services
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
                          {stayFacilities.length} Facilities
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stayFacilities.map((fac, idx) => (
                          <div
                            key={fac.id || fac.name || idx}
                            className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line/80 shadow-2xs transition-all duration-200 hover:ring-brand/30 hover:shadow-xs"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper ring-1 ring-line/70">
                                    <FacilityIcon name={fac.name} icon={fac.icon} />
                                  </span>
                                  <div>
                                    <p className="font-bold text-xs sm:text-sm text-ink group-hover:text-accent transition-colors">
                                      {fac.name}
                                    </p>
                                    {fac.floor && <p className="text-[11px] text-mute font-medium">{fac.floor}</p>}
                                  </div>
                                </div>
                                {fac.hours && (
                                  <span className="shrink-0 text-[10px] font-semibold text-ink/75 bg-paper rounded-full px-2.5 py-0.5 ring-1 ring-line/60">
                                    {fac.hours}
                                  </span>
                                )}
                              </div>
                              {(fac.details || fac.description) && (
                                <p className="mt-2.5 text-xs text-mute leading-relaxed line-clamp-2">
                                  {fac.details || fac.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Business Location & Trading Hours Schedule Card */}
              {(bio.city || bio.hours || bio.phone) && (
                <div className="mt-5 divide-y divide-line/70 rounded-3xl bg-paper/60 ring-1 ring-line/80 overflow-hidden shadow-2xs">
                  {bio.city && (
                    <a
                      href={maps || undefined}
                      target={maps ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={() => maps && recordTap(bio.handle, "maps")}
                      className="flex items-center gap-3 p-4 transition hover:bg-paper"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                        <MapPin size={18} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{bio.city}</span>
                      {maps && <ChevronRight size={18} className="shrink-0 text-mute" />}
                    </a>
                  )}
                  {bio.hours && (
                    <div className="p-1">
                      <TradingHoursScheduleView hours={bio.hours} placeName={bio.name || bio.handle} variant="row" />
                    </div>
                  )}
                  {bio.phone && (
                    <a
                      href={tel || undefined}
                      onClick={() => recordTap(bio.handle, "call")}
                      className="flex items-center gap-3 p-4 transition hover:bg-paper"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                        <Phone size={18} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{bio.phone}</span>
                      <ChevronRight size={18} className="shrink-0 text-mute" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Owner Meet & Hangout Hub and Proposals Inbox */}
          {isOwner && (
            <div className="mt-6 rounded-3xl bg-gradient-to-br from-paper/90 via-card to-paper/60 p-5 ring-1 ring-brand/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  <span>Meet &amp; Hangout · Your AirPal Link</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                  Live on @{bio.handle}
                </span>
              </div>
              <h3 className="font-display mt-2 text-lg font-bold text-ink">
                Meet &amp; Hangout with Friends &amp; Mates
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-mute">
                Anyone visiting your bio can request a 1-on-1 coffee, schedule a meeting, or invite you to a group
                hangout.
              </p>

              {/* Format Launcher Options */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                {(
                  [
                    {
                      type: "catchup" as const,
                      label: "Catch Up",
                      sub: "1-on-1 coffee",
                      Icon: Coffee,
                      tint: "bg-amber-500/15 text-amber-700",
                    },
                    {
                      type: "meeting" as const,
                      label: "Meeting",
                      sub: "1-on-1 sync",
                      Icon: Calendar,
                      tint: "bg-sky-500/15 text-sky-700",
                    },
                    {
                      type: "nightout" as const,
                      label: "Hangout",
                      sub: "Group plan",
                      Icon: Users,
                      tint: "bg-violet-500/15 text-violet-700",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setCatchUpInitialType(opt.type);
                      setCatchUpModalOpen(true);
                    }}
                    className="flex flex-col items-center rounded-2xl bg-card p-3 text-center ring-1 ring-line/80 shadow-2xs transition-all duration-200 hover:ring-brand/40 hover:shadow-xs active:scale-[0.98] cursor-pointer"
                  >
                    <span className={cn("mb-2 grid h-10 w-10 place-items-center rounded-2xl", opt.tint)}>
                      <opt.Icon size={18} />
                    </span>
                    <span className="text-xs font-bold text-ink">{opt.label}</span>
                    <span className="mt-0.5 text-[10px] text-mute">{opt.sub}</span>
                  </button>
                ))}
              </div>

              {/* Proposals Inbox when requests exist */}
              {catchUpsList.length > 0 && (
                <div className="mt-5 border-t border-line/70 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                      <HeartHandshake size={14} className="text-amber-600" />
                      <span>Meetup Proposals ({catchUpsList.length})</span>
                    </div>
                    <span className="text-[10px] font-bold rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-800">
                      Inbox
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {catchUpsList.map((item) => {
                      const eventPayload = {
                        title: `${item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Catch Up"}: ${item.requesterName}`,
                        description: `${item.notes || `AirPal with ${item.requesterName}`}\nVenue: ${item.venue || "TBD"}\nhttps://airpal.me/@${bio.handle}`,
                        startsAt: `${item.date || toZonedDateStr(new Date())}T${item.time || "14:00"}:00`,
                        venue: item.venue,
                        city: bio.city,
                        meetingLink: item.meetingLink,
                        meetingPlatform: item.meetingPlatform,
                      };

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-line/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                              {item.requesterPhoto ? (
                                <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                              ) : (
                                <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-sm text-white">
                                  {item.requesterName[0]}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-xs text-ink truncate">{item.requesterName}</p>
                                {item.requesterHandle && (
                                  <Link
                                    href={`/@${item.requesterHandle}`}
                                    className="text-[11px] text-mute hover:text-accent truncate"
                                  >
                                    @{item.requesterHandle}
                                  </Link>
                                )}
                              </div>
                              <p className="text-[11px] text-mute truncate mt-0.5">
                                {item.type === "meeting"
                                  ? "Meeting"
                                  : item.type === "nightout"
                                    ? "Hangout"
                                    : "Catch Up"}
                                {item.date && ` · ${item.date}`}
                                {item.time && ` @ ${item.time}`}
                                {item.venue && ` · ${item.venue}`}
                              </p>
                              {item.notes && (
                                <p className="text-[11px] text-ink/80 italic mt-0.5 truncate">"{item.notes}"</p>
                              )}
                              <div className="mt-2">
                                <CatchUpSlotActions item={item} />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {item.meetingLink && (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => void triggerHaptic("light")}
                                className={cn(
                                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition active:scale-95 touch-manipulation focus-visible:outline-2 focus-visible:outline-brand",
                                  item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                                    : "bg-brand/10 text-accent ring-1 ring-brand/30 hover:bg-brand/20",
                                )}
                                title={
                                  item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "Open FaceTime call"
                                    : "Join Google Meet video call"
                                }
                              >
                                {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime") ? (
                                  <PhoneCall size={13} className="text-emerald-700" />
                                ) : (
                                  <Video size={13} className="text-accent" />
                                )}
                                <span>
                                  {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "FaceTime"
                                    : "Google Meet"}
                                </span>
                              </a>
                            )}
                            <AddToCalendarMenu
                              event={eventPayload}
                              size="sm"
                              variant="ghost"
                              label="Sync to Phone"
                              buttonClassName="min-h-[44px] px-4 text-xs rounded-full border border-line"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-11 w-11 p-0 rounded-full text-mute hover:text-ink hover:bg-black/5"
                              onClick={() => {
                                updateCatchUpStatus(item.id, "dismissed");
                                setCatchUpsList((prev) => prev.filter((i) => i.id !== item.id));
                                toast.info("Request dismissed");
                              }}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Catch Up & Hangout Deck for Visitors */}
          {!isOwner &&
            !(bio.kind === "business" && ((bio.products || []).length > 0 || (bio.services || []).length > 0)) && (
              <div className="mt-6 rounded-3xl bg-gradient-to-br from-paper/90 via-card to-paper/60 p-5 ring-1 ring-line/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                    <Sparkles size={12} className="text-accent" />
                    <span>Meet &amp; Hangout</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      const next = toggleCatchUpReminder({
                        handle: bio.handle,
                        name: bio.name,
                        photo: avatar,
                        city: bio.city,
                        requesterUid: user?.uid,
                      });
                      toast[next ? "success" : "info"](
                        next ? `Saved a reminder to catch up with ${bio.name}` : `Removed reminder for ${bio.name}`,
                      );
                      setCatchUpsList(listCatchUpsForHandle(bio.handle));
                    }}
                    className={cn(
                      "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold ring-1 transition cursor-pointer active:scale-95",
                      hasCatchUpReminder(bio.handle)
                        ? "bg-amber-500/15 text-amber-800 ring-amber-500/40 font-bold"
                        : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
                    )}
                    title={hasCatchUpReminder(bio.handle) ? "Catch-up reminder active" : "Set a reminder to catch up"}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        hasCatchUpReminder(bio.handle) ? "bg-amber-500 motion-safe:animate-pulse" : "bg-mute/50",
                      )}
                    />
                    <span>{hasCatchUpReminder(bio.handle) ? "Reminder on ✓" : "Remind me"}</span>
                  </button>
                </div>
                <h3 className="font-display mt-2 text-lg font-bold text-ink">Catch up with {bio.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-mute">
                  Propose a 1-on-1 coffee, schedule a sync meeting, or create a group hangout plan.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  {(
                    [
                      {
                        type: "catchup" as const,
                        label: "Catch Up",
                        sub: "1-on-1 coffee",
                        Icon: Coffee,
                        tint: "bg-amber-500/15 text-amber-700",
                      },
                      {
                        type: "meeting" as const,
                        label: "Meeting",
                        sub: "1-on-1 sync",
                        Icon: Calendar,
                        tint: "bg-sky-500/15 text-sky-700",
                      },
                      {
                        type: "nightout" as const,
                        label: "Hangout",
                        sub: "Group plan",
                        Icon: Users,
                        tint: "bg-violet-500/15 text-violet-700",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        setCatchUpInitialType(opt.type);
                        setCatchUpModalOpen(true);
                      }}
                      className="flex flex-col items-center rounded-2xl bg-card p-3 text-center ring-1 ring-line/80 shadow-2xs transition-all duration-200 hover:ring-brand/40 hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <span className={cn("mb-2 grid h-10 w-10 place-items-center rounded-2xl", opt.tint)}>
                        <opt.Icon size={18} />
                      </span>
                      <span className="text-xs font-bold text-ink">{opt.label}</span>
                      <span className="mt-0.5 text-[10px] text-mute">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Public Plans & Hangouts created by this creator */}
          {userPlans.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" />
                  <span>Public Plans &amp; Hangouts</span>
                </h3>
                <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
                  {userPlans.length} {userPlans.length === 1 ? "Public Plan" : "Public Plans"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {userPlans.map((plan) => {
                  const planEventPayload = {
                    title: plan.title,
                    description: `${plan.notes || `AirPal Public Plan with @${bio.handle}`}\nhttps://airpal.me/plan/${plan.id}`,
                    startsAt: `${plan.date}T${plan.time || "12:00"}:00`,
                    venue: plan.destination || plan.city,
                    city: plan.city,
                  };

                  return (
                    <div
                      key={plan.id}
                      className="group flex flex-col justify-between rounded-3xl bg-card p-4 ring-1 ring-line shadow-2xs transition-all duration-200 hover:ring-brand/40 hover:shadow-xs"
                    >
                      <PlanGridCard plan={plan} />
                      <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-mute">
                          {plan.destination || plan.city || "Sydney"}
                        </span>
                        <AddToCalendarMenu
                          event={planEventPayload}
                          size="sm"
                          variant="ghost"
                          label="Sync to Phone"
                          buttonClassName="h-7 px-2.5 text-[10px] rounded-full border border-line"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* What's On / Appearing at Events */}
          {appearing.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">What’s On</p>
                <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
                  {appearing.length} {appearing.length === 1 ? "Event" : "Events"}
                </span>
              </div>
              <div className="space-y-2">
                {appearing.map((s) => {
                  const event = getEvent(s.eventId);
                  const stallEventPayload = {
                    title: `${bio.name} at ${event?.name || s.eventId}`,
                    description: `${s.offer ? `Offer: ${s.offer}\n` : ""}Booth: ${s.booth || "TBD"}\nhttps://airpal.me/@${bio.handle}`,
                    startsAt: event?.startsAt || `${toZonedDateStr(new Date())}T10:00:00`,
                    venue: s.location || event?.venue || "Sydney",
                    city: event?.city || bio.city,
                  };

                  return (
                    <div
                      key={s.id}
                      className="w-full flex items-center justify-between rounded-3xl bg-card p-4 text-left ring-1 ring-line/80 transition hover:bg-paper shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => nav(`/e/${s.eventId}`)}
                        className="min-w-0 flex-1 text-left active:scale-[0.99] cursor-pointer"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Appearing at</p>
                        <p className="font-display text-sm font-bold text-ink mt-0.5">
                          {event?.name || "Event / Market"}
                        </p>
                        {s.booth && <p className="text-xs text-mute mt-0.5">Booth {s.booth}</p>}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <AddToCalendarMenu
                          event={stallEventPayload}
                          size="sm"
                          variant="ghost"
                          label="Sync"
                          buttonClassName="min-h-[44px] px-4 text-xs rounded-full border border-line"
                        />
                        <button
                          type="button"
                          onClick={() => nav(`/e/${s.eventId}`)}
                          className="grid h-11 w-11 place-items-center rounded-full text-mute hover:text-ink hover:bg-black/5"
                          aria-label="View event"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured Live Offer Banner */}
          {liveOffer && (
            <div
              id="bio-offers"
              className="mt-7 scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-paper p-5 ring-1 ring-gold/40 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                  <Sparkles size={11} />
                  {liveOffer.badge}
                </span>
                <span className="text-[10px] font-medium text-mute uppercase tracking-wider">AirPal Offer</span>
              </div>
              <h3 className="font-display mt-2.5 text-lg sm:text-xl font-bold leading-snug text-ink">
                {liveOffer.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-mute">{liveOffer.detail}</p>
              <Button
                className="mt-4 w-full gap-2 rounded-full bg-brand text-white shadow-sm hover:bg-brand-ink active:scale-[0.98]"
                onClick={() =>
                  onClaimDeal({
                    id: "live-offer",
                    kind: "deal",
                    title: liveOffer.title,
                    detail: liveOffer.detail,
                    badge: liveOffer.badge,
                  })
                }
              >
                <Ticket size={15} className="text-accent" />
                Claim Live Offer
              </Button>
            </div>
          )}

          {/* Secondary Deals, Products & Services Catalog */}
          <BioCatalogSection
            label={liveOffer ? "More Deals & Offers" : "Deals & Offers"}
            items={deals}
            featured={!liveOffer}
            onTap={(kind) => recordTap(bio.handle, kind)}
            onClaim={onClaimDeal}
          />
          <BioCatalogSection
            label="Products"
            items={bio.products || []}
            onTap={(kind) => recordTap(bio.handle, kind)}
            id="bio-products"
          />
          <BioCatalogSection
            label="Services"
            items={bio.services || []}
            onTap={(kind) => recordTap(bio.handle, kind)}
            id="bio-services"
          />

          {/* Custom Outbound Links Stack */}
          {stacked.length > 0 && (
            <div className="mt-7">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent mb-2.5">Featured Links</h3>
              <ul className="space-y-2.5">
                {stacked
                  .filter((link) => isSafeBioHref(link.href))
                  .map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        onClick={() => recordTap(bio.handle, link.type)}
                        className="group flex h-13 sm:h-14 items-center justify-between rounded-full bg-brand px-6 text-sm sm:text-[15px] font-bold text-white shadow-xs transition-all duration-200 hover:bg-brand-ink hover:shadow-md active:scale-[0.99]"
                      >
                        <span className="truncate">{link.label || link.type}</span>
                        <ChevronRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Social Links Long Strip Section */}
          {bio.links && socialLinks(bio.links).some((l) => isSafeBioHref(l.href)) && (
            <div className="mt-8 pt-5 border-t border-line/60">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Follow &amp; Connect</p>
                <span className="text-[10px] font-medium text-mute uppercase tracking-wider">Social Channels</span>
              </div>
              <BioSocials links={bio.links} onTap={(kind) => recordTap(bio.handle, kind)} />
            </div>
          )}

          {/* Open in Maps Button */}
          {maps && (
            <div className="mt-5">
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  recordTap(bio.handle, "maps");
                  trackMapClick({ source: "bio" });
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-paper text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:bg-paper/80 shadow-2xs active:scale-95"
              >
                <MapPin size={15} className="text-accent" />
                <span>Open in Maps</span>
              </a>
            </div>
          )}

          {/* AirPal Guestlist sign up: Name, City, Email + interest opt-ins.
              Persists server-side (callable) so invites can actually be sent;
              the local club copy stays for on-device perks. */}
          {(bio.kind === "business" || ["bar", "club", "events", "eat"].includes(bio.category)) && (
            <form
              className="mt-8 rounded-3xl bg-paper/60 p-5 ring-1 ring-line/80 shadow-2xs space-y-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (listSending) return;
                const cityLabel =
                  listCity === "other"
                    ? listCityOther.trim()
                    : (CITY_OPTIONS.find((c) => c.id === listCity)?.label || "").trim();
                const problems = validateGuestlistSignup({
                  name: listName,
                  city: cityLabel,
                  email: listEmail,
                  interests: listInterests,
                  source: bio.handle,
                });
                if (problems.length > 0) {
                  toast.error(problems[0] || "Check the form and try again.");
                  return;
                }
                setListSending(true);
                void (async () => {
                  try {
                    await ensureAnonymousSession();
                    await joinGuestlistSignupRemote({
                      name: listName.trim(),
                      city: cityLabel,
                      email: listEmail.trim(),
                      interests: listInterests,
                      source: bio.handle,
                    });
                    addGuest(bio.handle, { email: listEmail, name: listName, source: "bio" });
                    joinClub({
                      email: listEmail,
                      name: listName || bio.name,
                      city: cityLabel,
                      invites: true,
                      offers: true,
                    });
                    toast.success("You're on the AirPal Guestlist");
                    setListEmail("");
                    setListName("");
                    setListCity("");
                    setListCityOther("");
                    setListInterests([]);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't join. Try again.");
                  } finally {
                    setListSending(false);
                  }
                })();
              }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">AirPal Guestlist</p>
                <h4 className="font-display text-base font-bold text-ink mt-0.5">VIP Invites &amp; Secret Spots</h4>
                <p className="text-[11.5px] text-mute mt-0.5">Get notified for exclusive gatherings, door perks, and secret drops.</p>
              </div>
              <label htmlFor="guestlist-name" className="sr-only">
                Your name
              </label>
              <input
                id="guestlist-name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Your Name"
                autoComplete="name"
                maxLength={80}
                className="h-11 w-full rounded-full bg-card px-4 text-xs font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand shadow-2xs"
              />
              <label htmlFor="guestlist-city" className="sr-only">
                Your city
              </label>
              <select
                id="guestlist-city"
                value={listCity}
                onChange={(e) => setListCity(e.target.value)}
                className="h-11 w-full rounded-full bg-card px-4 text-xs font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand shadow-2xs"
              >
                <option value="">Your City</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.region ? `, ${c.region}` : ""}
                  </option>
                ))}
                <option value="other">Somewhere else</option>
              </select>
              {listCity === "other" && (
                <>
                  <label htmlFor="guestlist-city-other" className="sr-only">
                    Your city or town
                  </label>
                  <input
                    id="guestlist-city-other"
                    value={listCityOther}
                    onChange={(e) => setListCityOther(e.target.value)}
                    placeholder="Your city or town"
                    autoComplete="address-level2"
                    maxLength={60}
                    className="h-11 w-full rounded-full bg-card px-4 text-xs font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand shadow-2xs"
                  />
                </>
              )}
              <label htmlFor="guestlist-email" className="sr-only">
                Your email
              </label>
              <input
                id="guestlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                value={listEmail}
                onChange={(e) => setListEmail(e.target.value)}
                placeholder="Your Email"
                className="h-11 w-full rounded-full bg-card px-4 text-xs font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus:border-brand shadow-2xs"
              />
              <fieldset>
                <legend className="text-[11px] font-semibold text-mute">I&apos;m into — pick any</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {GUESTLIST_INTERESTS.map((interest) => {
                    const on = listInterests.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setListInterests((prev) =>
                            prev.includes(interest.id) ? prev.filter((v) => v !== interest.id) : [...prev, interest.id],
                          )
                        }
                        className={
                          on
                            ? "min-h-[44px] shrink-0 cursor-pointer rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            : "min-h-[44px] shrink-0 cursor-pointer rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        }
                      >
                        {interest.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={listSending}
                className="h-11 w-full rounded-full bg-brand text-xs font-bold text-white transition hover:bg-brand-ink active:scale-95 shadow-xs disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {listSending ? "Joining VIP list…" : "Join the Guestlist (Free)"}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-mute">
                {GUESTLIST_CONSENT_V1} Includes AirPal Club perks and priority invites.
              </p>
            </form>
          )}

          {bio.propertyId ? <BioPulseRate propertyId={bio.propertyId} /> : null}

          {/* Invite code — every bio carries its owner's code so any visitor can join under them */}
          {bio.ownerUid && (
            <div className="mt-8 rounded-3xl bg-gold/10 p-4 ring-1 ring-gold/30 shadow-2xs">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                <Ticket size={13} aria-hidden />
                {isOwner ? "Your invite code" : `Join with ${bio.name.split(" ")[0]}'s code`}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-card px-3 py-2 text-sm font-bold text-ink ring-1 ring-line/70">
                  @{bio.handle}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyInviteCode()}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:bg-paper active:scale-95"
                  aria-label="Copy invite code"
                >
                  {copiedCode ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} className="text-mute" />
                  )}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareInvite()}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
                  aria-label="Share invite link"
                >
                  <Share2 size={14} />
                  Invite
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-mute">
                {isOwner
                  ? "Share your code — you both earn Stars when your mate completes their first experience."
                  : "Use this code when you join — you both earn Stars when you complete your first experience."}
              </p>
            </div>
          )}

          {/* Brand Footer & Viral @handle CTA */}
          <footer className="mt-10 flex flex-col items-center justify-center gap-2 border-t border-line/60 pt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
              <BrandMark compact />
              <span className="font-display text-base font-bold tracking-tight">
                AirPal<span className="text-accent">.me</span>
              </span>
            </Link>
            <p className="text-xs text-mute">
              AirPal.Me · Plan your day, organise your life &amp; share who you are ·{" "}
              <Link href="/bio/setup" className="font-semibold text-ink underline hover:text-accent">
                Claim your free @handle
              </Link>
            </p>
            <p className="text-[11px] text-mute/80">
              Discover events, tickets &amp; perks on{" "}
              <Link href="/pass" className="font-semibold text-ink underline hover:text-accent">
                AirPal Pass →
              </Link>
            </p>
            <button
              type="button"
              className="mt-1 text-xs text-mute/80 hover:text-ink font-mono"
              onClick={() => setShareModalOpen(true)}
            >
              airpal.me/@{bio.handle}
            </button>
          </footer>
        </div>
      </div>

      {/* Claim Redemption Modal */}
      {claim && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setClaim(null)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-card p-6 text-center shadow-2xl ring-1 ring-line animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{claim.badge}</p>
            <p className="font-mono mt-3 text-4xl font-bold tracking-widest text-ink">{claim.code}</p>
            <p className="mt-2 text-xs font-medium text-mute leading-relaxed">{claim.detail}</p>
            <div className="mt-4 rounded-2xl bg-gold/10 p-3 text-xs text-accent font-medium">
              Active offer · Show this code to your server or at the till.
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-brand py-3 text-xs font-bold text-white transition hover:bg-brand-ink active:scale-95"
              onClick={() => setClaim(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Share QR Dialog */}
      <BioShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        handle={bio.handle}
        name={bio.name}
        url={share}
      />

      {/* Catch Up / Meeting / Hangout Modal */}
      <BioCatchUpModal
        open={catchUpModalOpen}
        onClose={() => setCatchUpModalOpen(false)}
        handle={bio.handle}
        name={bio.name}
        city={bio.city}
        avatar={avatar}
        ownerUid={bio.ownerUid}
        initialType={catchUpInitialType}
        defaultMeetingUrl={bio.meetingUrl}
        defaultMeetingPlatform={bio.preferredMeetingPlatform}
      />

      {/* Availability Status Modal */}
      <BioStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        handle={bio.handle}
        currentStatus={
          bio.availabilityStatus ||
          (bio.openNow === true ? "available" : bio.openNow === false ? "offline" : "available")
        }
        currentCustomStatus={bio.customStatus}
        currentEmoji={bio.customStatusEmoji}
        onSaved={(newStatus, newCustom, newEmoji) => {
          if (remote) {
            setRemote({
              ...remote,
              availabilityStatus: newStatus,
              openNow: newStatus === "available",
              customStatus: newCustom,
              customStatusEmoji: newEmoji,
            });
          }
        }}
      />
      {/* AirPal Universal Chat Modal */}
      <AirPalChatModal
        open={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setChatConversation(null);
        }}
        conversation={chatConversation}
        propertyContext={isStay ? propertyData : undefined}
      />
    </div>
  );
}
