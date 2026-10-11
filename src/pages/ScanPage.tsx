import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Image as ImageIcon, Ticket, Upload, Zap } from "lucide-react";
import { decodeQrFromImageFile, parseQrPayload, pathForIntent } from "@/lib/qr";
import { isTicketId } from "@shared/booking";
import { useStay } from "@/contexts/StayContext";
import { useLocale } from "@/contexts/LocaleContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { hrefForPlace } from "@/lib/bio-handle";
import { sizedImageUrl } from "@/lib/media-srcset";
import { activePlaces, placesForLocation } from "@/lib/catalog";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useListings } from "@/contexts/ListingsContext";
import { noteQrContext } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/native";
import { qrContextIdFromPath, qrContextIdFromStay } from "@shared/analytics";
import { WaveListenCard } from "@/components/wave/WaveListenCard";

/**
 * Universal Scanner for AirPal — Scans live QR camera feed, user photo library images,
 * room numbers, @handles, stays, plans, and events across iOS, Android & Web.
 */

export function ScanPage() {
  const [, nav] = useLocation();
  const { session, setSession } = useStay();
  const { t } = useLocale();
  const { version, remoteLoaded } = useListings();
  const { here, city, usingGps } = useLocalNow();
  const quickPlaces = useMemo(
    () => placesForLocation(activePlaces(), here, city, usingGps).slice(0, 6),
    [version, here, city, usingGps],
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [denied, setDenied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const running = useRef(false);

  const go = useCallback(
    (href: string) => {
      if (href.startsWith("/g/")) {
        const u = new URL(href, window.location.origin);
        setSession({
          kind: "stay",
          propertyId: u.pathname.split("/")[2] || undefined,
          room: u.searchParams.get("room") || undefined,
          roomToken: u.searchParams.get("r") || undefined,
        });
      }
      if (href.startsWith("/q/")) setSession({ kind: "marker", markerId: href.split("/")[2] });
      if (href.startsWith("/c/")) setSession({ kind: "campus", campusId: href.split("/")[2]?.split("?")[0] });
      const contextId =
        qrContextIdFromPath(href.split("?")[0] || href) ||
        qrContextIdFromStay({
          kind: href.startsWith("/g/") ? "stay" : href.startsWith("/c/") ? "campus" : "marker",
          propertyId: href.startsWith("/g/") ? href.split("/")[2]?.split("?")[0] : undefined,
          markerId: href.startsWith("/q/") ? href.split("/")[2] : undefined,
          campusId: href.startsWith("/c/") ? href.split("/")[2]?.split("?")[0] : undefined,
        });
      if (contextId) noteQrContext(contextId, { source: "scan" });
      nav(href);
    },
    [nav, setSession],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    running.current = true;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setLive(true);
        const tick = () => {
          if (!running.current) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(img.data, img.width, img.height);
              if (code?.data) {
                const intent = parseQrPayload(code.data);
                const path = pathForIntent(intent);
                if (path) {
                  void triggerHaptic("success");
                  running.current = false;
                  go(path);
                  return;
                }
                toast.message("Unknown code scanned");
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setDenied(true);
      }
    }

    void start();
    return () => {
      running.current = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [go, cameraAttempt]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    void triggerHaptic("light");
    try {
      const qrData = await decodeQrFromImageFile(file);
      if (qrData) {
        const intent = parseQrPayload(qrData);
        const path = pathForIntent(intent);
        if (path) {
          void triggerHaptic("success");
          toast.success("QR code decoded from photo");
          go(path);
          return;
        }
        toast.error("Unrecognized QR payload in photo.");
      } else {
        toast.error("No clear QR code detected in this photo. Try another image.");
      }
    } catch {
      toast.error("Failed to read image file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    void triggerHaptic("medium");

    // Pure room numbers resolve inside the current stay only — never a hardcoded demo property.
    if (/^\d{1,4}$/.test(clean)) {
      if (session.propertyId) {
        go(`/g/${session.propertyId}?room=${clean}`);
      } else {
        toast.error("Scan your room QR first — then a room number will open it.");
      }
      return;
    }
    // Handle @handles
    if (clean.startsWith("@")) {
      go(`/${clean}`);
      return;
    }
    // Handle ticket tokens / booking IDs
    if (clean.toLowerCase().startsWith("tkt-") || clean.toLowerCase().startsWith("ticket-")) {
      const tid = clean.replace(/^(tkt-|ticket-)/i, "");
      go(`/ticket/${encodeURIComponent(tid)}`);
      return;
    }
    // Handle invite codes
    if (clean.toUpperCase().startsWith("INV-") || (clean.length === 6 && !clean.includes("/"))) {
      go(`/invite/${clean.toUpperCase()}`);
      return;
    }
    // Handle direct path
    if (clean.startsWith("/")) {
      go(clean);
      return;
    }
    // Parse as QR payload
    const intent = parseQrPayload(clean);
    const path = pathForIntent(intent);
    if (path) {
      go(path);
      return;
    }
    // Fallback: if matches ticket ID format
    if (isTicketId(clean) && clean.length >= 8) {
      go(`/ticket/${encodeURIComponent(clean)}`);
      return;
    }
    toast.error("Code not recognised. Try entering a ticket ID, room #, @handle, or invite code.");
  };

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col px-4 pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-2">
      {/* Pass & Offline Cache Status Header */}
      <div className="flex items-center justify-between gap-2 py-1 mb-2">
        <Link
          href="/pass"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <ArrowLeft size={13} />
          <span>AirPal Pass</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
          <Zap size={12} className="text-emerald-600" />
          <span>Offline Cache Validated</span>
        </div>
        <Link
          href="/me/tickets"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <Ticket size={13} className="text-amber-500" />
          <span>Passes</span>
        </Link>
      </div>

      <div className="relative mt-1 overflow-hidden rounded-[28px] bg-neutral-900 shadow-lg ring-1 ring-line">
        <video ref={videoRef} className="h-64 w-full object-cover md:h-80" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleImageUpload(e)}
        />

        {!live && (
          <div className="absolute inset-0 grid content-center justify-items-center gap-2 px-6 pb-16 text-center text-sm text-white/70">
            <span>{denied ? t("cameraOff") : t("openingCamera")}</span>
            {denied && (
              <>
                <p className="max-w-xs text-xs leading-relaxed text-white/60">
                  Allow camera access in browser settings, or upload a saved QR photo / enter code below.
                </p>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDenied(false);
                      setCameraAttempt((n) => n + 1);
                    }}
                    className="min-h-[44px] rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25 active:scale-95"
                  >
                    Try Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                  >
                    <Upload size={13} />
                    <span>Upload QR Image</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {live && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-40 w-40 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
          </div>
        )}

        {/* Floating Scanner Controls (Upload QR Image) */}
        <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-black/60 px-3.5 py-2 text-xs font-semibold text-white shadow-md backdrop-blur-md hover:bg-black/80 transition active:scale-95 border border-white/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ImageIcon size={14} className="text-accent" />
            <span>{uploading ? "Scanning Photo…" : "Scan Photo"}</span>
          </button>
          <span className="text-[11px] font-semibold text-white/80 backdrop-blur-xs bg-black/40 px-2.5 py-1 rounded-full">
            AirPal Universal QR
          </span>
        </div>
      </div>

      <WaveListenCard />

      {/* Manual Code / PIN Entry */}
      <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
        <label htmlFor="scan-manual-code" className="sr-only">
          Room number, invite code, or handle
        </label>
        <input
          id="scan-manual-code"
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Enter room # (e.g. 101), invite code, or @handle…"
          className="h-11 flex-1 rounded-2xl bg-card px-4 text-[16px] md:text-sm font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand placeholder:text-mute focus-visible:border-brand"
        />
        <button
          type="submit"
          className="min-h-[44px] h-11 rounded-2xl bg-brand px-4 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-brand-ink transition active:scale-95 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Open
        </button>
      </form>

      {!remoteLoaded && quickPlaces.length === 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 pb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-card ring-1 ring-line" />
          ))}
        </div>
      ) : quickPlaces.length === 0 ? (
        <div className="mt-5 pb-6">
          <EmptyState
            title="Nothing nearby to try yet"
            body="Enter a room number, invite code, or @handle — or open Explore."
            action={() => nav("/")}
            actionLabel={t("explore")}
          />
        </div>
      ) : (
        <>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{t("try")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 pb-6">
            {quickPlaces.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  void triggerHaptic("light");
                  nav(hrefForPlace(p));
                }}
                className="relative h-28 overflow-hidden rounded-3xl bg-neutral-900 transition active:scale-95 cursor-pointer"
              >
                {p.heroImage && (
                  <img
                    src={sizedImageUrl(p.heroImage, 400)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="hero-scrim absolute inset-0" />
                <span className="absolute inset-x-0 bottom-3 px-2 text-center font-display text-[16px] text-white">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
