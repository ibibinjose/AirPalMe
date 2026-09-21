import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Coffee,
  ContactRound,
  Edit3,
  Globe,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Sparkles,
  Ticket,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { BioCatalogItem } from "@shared/bio";
import { BUSINESS_CATEGORIES } from "@shared/business";
import { FollowButton, LikeButton } from "@/components/social/SocialButtons";
import { shareOrDownloadVCard, upsertPerson } from "@/lib/people";
import { BrandMark } from "@/components/brand/BrandMark";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { BioSocials } from "@/components/bio/BioSocials";
import { BioCatalogSection } from "@/components/bio/BioCatalog";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { listCatchUpsForHandle, subscribeCatchUpsForOwner, updateCatchUpStatus, type CatchUpItem } from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { fetchPublicBio } from "@/lib/bio-store";
import { resolvePublicBio } from "@/lib/bio-handle";
import { claimCode, loadClaim, saveClaim } from "@/lib/bio-claims";
import { liveBackendEnabled, claimBioOfferRemote } from "@/lib/functions";
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
  stackLinks,
} from "@shared/bio";
import type { PlanType } from "@shared/plan";
import { mapsPlaceIdUrl, mapsPlaceUrl } from "@/lib/maps";
import { NotFoundPage } from "./NotFoundPage";
import { cn } from "@/lib/cn";
import { useClub } from "@/contexts/ClubContext";

export function BioPublicPage() {
  const [path, nav] = useLocation();
  const [, params] = useRoute(BIO_PUBLIC_PATH);
  const handle = normalizeHandle(params?.handle || params?.[0] || parseAtHandle(path) || "");
  const { user, requireUser } = useAuth();
  const { byHandle, recordTap, mine } = useBio();
  const { addGuest, joinClub } = useClub();
  const [listEmail, setListEmail] = useState("");
  const [listName, setListName] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [catchUpInitialType, setCatchUpInitialType] = useState<PlanType>("catchup");
  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>([]);
  const { stalls, getEvent } = useEvents();
  const local = resolvePublicBio(handle, byHandle);
  const [remote, setRemote] = useState<typeof local>();
  const [tried, setTried] = useState(!handle);
  const [claim, setClaim] = useState<{ code: string; badge: string; detail: string } | null>(null);
  const viewed = useRef("");

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

  useEffect(() => {
    if (!profile) return;
    if (viewed.current === profile.handle) return;
    viewed.current = profile.handle;
    recordTap(profile.handle, "view");
    setShareMeta({
      title: `${profile.name} (@${profile.handle}) · AirPal.Me`,
      description: profile.shortWhy || profile.offer?.detail || "On AirPal.Me",
      image: profile.cover || profile.avatar,
      url: `${window.location.origin}${bioPath(profile.handle)}`,
    });
  }, [profile, recordTap]);

  if (!profile && !tried) {
    return (
      <div className="mx-auto max-w-md pb-12" aria-label="Loading profile" role="status">
        <div className="h-44 w-full animate-pulse bg-card sm:h-52" />
        <div className="px-4">
          <div className="flex items-end justify-between">
            <div className="-mt-12 sm:-mt-14 h-24 w-24 sm:h-28 sm:w-28 animate-pulse rounded-full bg-card ring-4 ring-paper shadow-md" />
            <div className="mb-1 h-8 w-24 animate-pulse rounded-full bg-card" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-md bg-card" />
            <div className="h-3.5 w-24 animate-pulse rounded-md bg-card" />
            <div className="h-4 w-64 animate-pulse rounded-md bg-card" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-full bg-card" />
            <div className="h-10 flex-1 animate-pulse rounded-full bg-card" />
            <div className="h-10 w-16 animate-pulse rounded-full bg-card" />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="h-10 animate-pulse rounded-full bg-card" />
            <div className="h-10 animate-pulse rounded-full bg-card" />
            <div className="h-10 animate-pulse rounded-full bg-card" />
          </div>
        </div>
      </div>
    );
  }
  if (!profile) return <NotFoundPage />;
  const bio = profile;

  const isOwner = Boolean(
    (user && bio.ownerUid && bio.ownerUid === user.uid) ||
    (user && bio.ownerEmail && bio.ownerEmail === user.email) ||
    (mine && mine.handle === bio.handle),
  );

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
  const websiteUrl =
    websiteLink?.href ||
    (bio.domain ? (bio.domain.startsWith("http") ? bio.domain : `https://${bio.domain}`) : undefined);

  // WhatsApp URL resolution
  const whatsappLink = bio.links.find((l) => l.type === "whatsapp");
  const whatsappUrl =
    whatsappLink?.href || (bio.phone ? `https://wa.me/${bio.phone.replace(/[^0-9]/g, "")}` : undefined);

  // Call / tel resolution
  const callLink = bio.links.find((l) => l.type === "call");
  const tel = bio.phone ? `tel:${bio.phone.replace(/\s/g, "")}` : callLink?.href;

  const share =
    typeof window !== "undefined"
      ? `${window.location.origin}${bioPath(bio.handle)}`
      : `https://airpal.me${bioPath(bio.handle)}`;
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

  return (
    <div className="mx-auto max-w-5xl pb-16 pb-safe">
      {/* Hero Cover Header (clean & bright, no dark overlay scrim) */}
      <div className="relative overflow-hidden rounded-b-3xl sm:rounded-3xl">
        {bio.cover ? (
          <Photo src={bio.cover} className="h-44 w-full object-cover sm:h-56 lg:h-64" />
        ) : (
          <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#1b221d] via-[#222b24] to-[#121614] sm:h-56 lg:h-64">
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:18px_18px]" />
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute left-3.5 top-3.5 z-10 inline-flex items-center rounded-2xl bg-white/95 p-1 shadow-md ring-1 ring-black/10 backdrop-blur-md">
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
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink/75 transition hover:bg-black/5 hover:text-ink active:scale-95"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-4 w-[1px] bg-line/80" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nav("/");
            }}
            className="flex h-8 items-center rounded-xl px-1.5 transition hover:bg-black/5 active:scale-95"
            aria-label="AirPal Home"
            title="AirPal Home"
          >
            <BrandMark compact />
          </button>
        </div>

        {/* Top Right Bio Handle Badge */}
        <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5">
          {isOwner && (
            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-white/95 px-2.5 text-xs font-semibold text-ink shadow-md ring-1 ring-black/10 backdrop-blur-md hover:bg-white active:scale-95 transition"
              title="Set WhatsApp / Availability Status"
            >
              <span>Status</span>
            </button>
          )}
          <BioHandleButton handle={bio.handle} />
        </div>
      </div>

      <div className="px-4">
        {/* Profile Header: Left-aligned Half-Overlapping Avatar with Availability Ring */}
        <div className="flex items-end justify-between">
          <div className="relative">
            <div
              className={cn(
                "-mt-12 sm:-mt-14 relative z-10 h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full bg-paper ring-4 transition-all duration-300 shadow-md",
                statusInfo.ringClass,
              )}
            >
              {avatar ? (
                <Photo src={avatar} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-ink font-display text-3xl font-bold text-white">
                  {bio.name[0]}
                </span>
              )}
            </div>
          </div>

          {/* Right Action (Edit profile / Claim / Connect) */}
          <div className="mb-1 flex items-center gap-2">
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink shadow-sm hover:bg-paper"
                  onClick={() => setStatusModalOpen(true)}
                >
                  <Sparkles size={12} className="text-gold" />
                  Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-card px-3.5 text-xs font-semibold text-ink shadow-sm hover:bg-paper"
                  onClick={() => nav("/bio/edit")}
                >
                  <Edit3 size={13} />
                  Edit
                </Button>
              </div>
            ) : unclaimed ? (
              <Button
                size="sm"
                className="rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-sm hover:brightness-110"
                onClick={() => nav(`/bio/setup?handle=${bio.handle}`)}
              >
                Claim @{bio.handle}
              </Button>
            ) : bio.kind === "person" ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink shadow-sm hover:bg-paper"
                  aria-label={`Save ${bio.name} to phone contacts`}
                  title="Save contact to phone (.vcf)"
                  onClick={() => {
                    void shareOrDownloadVCard({
                      name: bio.name,
                      phone: bio.phone,
                      url: share,
                      note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                    });
                    toast.success(`Contact card for ${bio.name} generated`);
                  }}
                >
                  <ContactRound size={14} className="text-brand" />
                  <span>Save Contact</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink shadow-sm hover:bg-paper"
                aria-label={`Save ${bio.name} to phone contacts`}
                title="Save contact to phone (.vcf)"
                onClick={() => {
                  void shareOrDownloadVCard({
                    name: bio.name,
                    phone: bio.phone,
                    url: share,
                    note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                  });
                  toast.success(`Contact card for ${bio.name} generated`);
                }}
              >
                <ContactRound size={14} className="text-brand" />
                <span>Save Contact</span>
              </Button>
            )}
          </div>
        </div>

        {/* Profile Info Left-Aligned */}
        <div className="mt-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">{bio.name}</h1>
            {bio.categoryTag && (
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                {bio.categoryTag}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs font-medium text-mute">
            @{bio.handle}
            {bio.pronouns && ` · ${bio.pronouns}`}
          </p>

          {/* WhatsApp / Availability Status Pill */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => isOwner && setStatusModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all",
                statusInfo.badgeBg,
                statusInfo.textColor,
                isOwner ? "cursor-pointer hover:brightness-95 active:scale-95" : "cursor-default",
              )}
              title={isOwner ? "Click to change availability status" : statusInfo.description}
            >
              <span>{statusInfo.label}</span>
              {bio.customStatus && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="font-normal text-ink/90 truncate max-w-[220px]">
                    {bio.customStatusEmoji && `${bio.customStatusEmoji} `}
                    {bio.customStatus}
                  </span>
                </>
              )}
              {isOwner && <Edit3 size={11} className="opacity-60 ml-0.5" />}
            </button>

            {bio.hours && <span className="text-xs text-mute font-medium">· {bio.hours}</span>}
          </div>

          {(bio.city || bio.category || bio.languages) && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-mute">
              {bio.city && (
                <>
                  <MapPin size={12} className="text-gold shrink-0" aria-hidden />
                  <span>{bio.city}</span>
                </>
              )}
              {bio.category && (
                <span>· {BUSINESS_CATEGORIES.find((c) => c.id === bio.category)?.label}</span>
              )}
              {bio.languages && <span>· Languages: {bio.languages}</span>}
            </p>
          )}

          {bio.shortWhy && <p className="mt-2 text-[14px] leading-relaxed text-ink/85 font-normal">{bio.shortWhy}</p>}

          {/* Extended Bio / About Story Card */}
          {bio.aboutText && (
            <div className="mt-3.5 rounded-2xl bg-card p-4 border border-line/70 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-1">About Story</p>
              <p className="text-xs leading-relaxed text-ink/80 whitespace-pre-line">{bio.aboutText}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <FollowButton handle={bio.handle} name={bio.name} className="flex-1 h-10 text-xs font-semibold" />
          <LikeButton handle={bio.handle} name={bio.name} className="flex-1 h-10 text-xs font-semibold" />
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-line transition hover:bg-paper active:scale-95 shrink-0"
            title="Share & QR"
          >
            <QrCode size={15} className="text-gold" />
            <span>QR</span>
          </button>
        </div>

        {/* Primary Action Row 2: [Website], [WhatsApp], [Call] in one line */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordTap(bio.handle, websiteLink?.type || "website")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card px-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-line transition hover:bg-paper hover:ring-sky-500/40 active:scale-95"
            >
              <Globe size={14} className="text-sky-600 shrink-0" />
              <span className="truncate">Website</span>
            </a>
          ) : (
            <div className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card/40 px-2 text-xs font-medium text-mute/50 ring-1 ring-line/40 cursor-not-allowed">
              <Globe size={14} className="opacity-40 shrink-0" />
              <span className="truncate">Website</span>
            </div>
          )}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordTap(bio.handle, "whatsapp")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card px-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-line transition hover:bg-paper hover:ring-emerald-500/40 active:scale-95"
            >
              <MessageCircle size={14} className="text-emerald-600 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </a>
          ) : (
            <div className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card/40 px-2 text-xs font-medium text-mute/50 ring-1 ring-line/40 cursor-not-allowed">
              <MessageCircle size={14} className="opacity-40 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </div>
          )}

          {tel ? (
            <a
              href={tel}
              onClick={() => recordTap(bio.handle, "call")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card px-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-line transition hover:bg-paper hover:ring-amber-500/40 active:scale-95"
            >
              <Phone size={14} className="text-amber-600 shrink-0" />
              <span className="truncate">Call</span>
            </a>
          ) : (
            <div className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-card/40 px-2 text-xs font-medium text-mute/50 ring-1 ring-line/40 cursor-not-allowed">
              <Phone size={14} className="opacity-40 shrink-0" />
              <span className="truncate">Call</span>
            </div>
          )}
        </div>

        {/* Who is interested to catch up with you (Owner Inbox & Requests) */}
        {isOwner && catchUpsList.length > 0 && (
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-paper to-card p-5 ring-1 ring-amber-500/30 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                <HeartHandshake size={14} className="text-amber-600" />
                <span>Interested in Catching Up ({catchUpsList.length})</span>
              </div>
              <span className="text-[10px] font-bold rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-800">
                Inbox
              </span>
            </div>

            <p className="mt-1 text-xs text-mute">People who want to meet, grab coffee or sync up with you.</p>

            <div className="mt-3 space-y-2.5">
              {catchUpsList.map((item) => {
                const eventPayload = {
                  title: `${item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Catch Up"}: ${item.requesterName}`,
                  description: `${item.notes || `AirPal with ${item.requesterName}`}\nVenue: ${item.venue || "TBD"}\nhttps://airpal.me/@${bio.handle}`,
                  startsAt: `${item.date || toZonedDateStr(new Date())}T${item.time || "14:00"}:00`,
                  venue: item.venue,
                  city: bio.city,
                };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-line shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                        {item.requesterPhoto ? (
                          <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-ink font-bold text-sm text-white">
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
                              className="text-[11px] text-mute hover:text-brand truncate"
                            >
                              @{item.requesterHandle}
                            </Link>
                          )}
                        </div>
                        <p className="text-[11px] text-mute truncate mt-0.5">
                          {item.type === "meeting"
                            ? "📅 Meeting"
                            : item.type === "nightout"
                              ? "👥 Hangout"
                              : "☕ Catch Up"}
                          {item.date && ` · ${item.date}`}
                          {item.time && ` @ ${item.time}`}
                          {item.venue && ` · ${item.venue}`}
                        </p>
                        {item.notes && <p className="text-[11px] text-ink/80 italic mt-0.5 truncate">"{item.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <AddToCalendarMenu
                        event={eventPayload}
                        size="sm"
                        variant="ghost"
                        label="Sync Calendar"
                        buttonClassName="h-7 px-2 text-[11px] rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] rounded-lg text-mute hover:text-ink"
                        onClick={() => {
                          updateCatchUpStatus(item.id, "dismissed");
                          setCatchUpsList((prev) => prev.filter((i) => i.id !== item.id));
                          toast.info("Request dismissed");
                        }}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isOwner && (
          <div className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Meet &amp; hangout</p>
            <h3 className="font-display mt-1.5 text-lg font-semibold text-ink">Catch up or meet with {bio.name}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">
              Propose a 1-on-1 coffee, schedule a sync meeting, or create a group hangout plan.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
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
                    setCatchUpInitialType(opt.type);
                    setCatchUpModalOpen(true);
                  }}
                  className="flex flex-col items-center rounded-2xl bg-paper px-2 py-3 text-center ring-1 ring-line transition hover:ring-brand/40 active:scale-[0.98]"
                >
                  <span className={cn("mb-1.5 grid h-10 w-10 place-items-center rounded-2xl", opt.tint)}>
                    <opt.Icon size={18} />
                  </span>
                  <span className="text-xs font-bold text-ink">{opt.label}</span>
                  <span className="mt-0.5 text-[10px] text-mute">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* What's On — Appearing at Events */}
        {appearing.length > 0 && (
          <div className="mt-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">What’s On</p>
            <div className="mt-2 space-y-2">
              {appearing.map((s) => {
                const event = getEvent(s.eventId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => nav(`/e/${s.eventId}`)}
                    className="w-full rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line transition hover:bg-card/80"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">Appearing at</p>
                    <p className="font-medium">{event?.name || "Event / Market"}</p>
                    {s.booth && <p className="text-sm text-mute">Booth {s.booth}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Live Offer Banner */}
        {liveOffer && (
          <div className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-card to-paper p-5 ring-1 ring-gold/40 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                <Sparkles size={12} />
                {liveOffer.badge}
              </span>
              <span className="text-[11px] font-medium text-mute uppercase tracking-wider">AirPal Offer</span>
            </div>
            <h3 className="font-display mt-2.5 text-xl font-bold leading-snug text-ink">{liveOffer.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-mute">{liveOffer.detail}</p>
            <Button
              className="mt-4 w-full gap-2 bg-brand text-white hover:bg-brand-ink"
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
              <Ticket size={16} className="text-gold" />
              Claim Live Offer
            </Button>
          </div>
        )}

        {/* Secondary Deals & Catalog */}
        <BioCatalogSection
          label={liveOffer ? "More Deals & Offers" : "Deals & Offers"}
          items={deals}
          featured={!liveOffer}
          onTap={(kind) => recordTap(bio.handle, kind)}
          onClaim={onClaimDeal}
        />
        <BioCatalogSection label="Products" items={bio.products || []} onTap={(kind) => recordTap(bio.handle, kind)} />
        <BioCatalogSection label="Services" items={bio.services || []} onTap={(kind) => recordTap(bio.handle, kind)} />

        {/* Outbound Link Stack */}
        {stacked.length > 0 && (
          <ul className="mt-5 space-y-2">
            {stacked
              .filter((link) => isSafeBioHref(link.href))
              .map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={() => recordTap(bio.handle, link.type)}
                    className="flex h-14 items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-ink active:scale-[0.99]"
                  >
                    {link.label || link.type}
                  </a>
                </li>
              ))}
          </ul>
        )}

        <BioSocials links={bio.links} onTap={(kind) => recordTap(bio.handle, kind)} />

        {/* Open in Maps */}
        {maps && (
          <div className="mt-4">
            <a
              href={maps}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                recordTap(bio.handle, "maps");
                trackMapClick({ source: "bio" });
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card/80 shadow-sm"
            >
              <MapPin size={16} className="text-gold" />
              <span>Open in Maps</span>
            </a>
          </div>
        )}

        {/* Guest list sign up */}
        {(bio.kind === "business" || ["bar", "club", "events", "eat"].includes(bio.category)) && (
          <form
            className="mt-8 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                addGuest(bio.handle, { email: listEmail, name: listName, source: "bio" });
                joinClub({ email: listEmail, name: listName || bio.name, city: bio.city, invites: true, offers: true });
                toast.success("On the guest list · AirPal Club");
                setListEmail("");
                setListName("");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Guest list</p>
            <input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Name"
              className="h-12 w-full rounded-full bg-card px-4 border border-line outline-none focus:border-brand"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={listEmail}
              onChange={(e) => setListEmail(e.target.value)}
              placeholder="Email"
              className="h-12 w-full rounded-full bg-card px-4 border border-line outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="h-12 w-full rounded-full bg-brand text-sm font-medium text-white transition hover:bg-brand-ink"
            >
              Join the list
            </button>
            <p className="text-center text-[12px] text-mute">Also joins AirPal Club for invites and offers.</p>
          </form>
        )}

        {/* Footer Brand & Handle Link */}
        <footer className="mt-12 flex flex-col items-center justify-center gap-2 border-t border-line/60 pt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
            <BrandMark compact />
            <span className="font-display text-base font-bold tracking-tight">
              AirPal<span className="text-brand">.me</span>
            </span>
          </Link>
          <p className="text-xs text-mute">
            AirPal bio for people, venues & creators ·{" "}
            <Link href="/bio/setup" className="font-semibold text-ink underline hover:text-brand">
              Claim your free @handle
            </Link>
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-mute/80 hover:text-ink"
            onClick={() => setShareModalOpen(true)}
          >
            Share · airpal.me/@{bio.handle}
          </button>
        </footer>
      </div>

      {/* Claim Redemption Modal */}
      {claim && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-6 backdrop-blur-sm"
          onClick={() => setClaim(null)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-paper p-6 text-center shadow-2xl ring-1 ring-line"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{claim.badge}</p>
            <p className="font-mono mt-3 text-4xl font-bold tracking-widest text-ink">{claim.code}</p>
            <p className="mt-2 text-sm font-medium text-mute leading-relaxed">{claim.detail}</p>
            <div className="mt-4 rounded-2xl bg-gold/10 p-3 text-xs text-gold-dark">
              Active offer · Show this code to your server or at the till.
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-ink"
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
      />

      {/* WhatsApp / Availability Status Modal */}
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
    </div>
  );
}
