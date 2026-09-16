import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { parseQrPayload, pathForIntent } from "@/lib/qr";
import { useStay } from "@/contexts/StayContext";
import { useLocale } from "@/contexts/LocaleContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { hrefForPlace } from "@/lib/bio-handle";
import { activePlaces } from "@/lib/catalog";
import { useListings } from "@/contexts/ListingsContext";
import { noteQrContext } from "@/lib/analytics";
import { triggerHaptic } from "@/lib/native";
import { qrContextIdFromPath, qrContextIdFromStay } from "@shared/analytics";

/**
 * Quick links are live listings only — no hardcoded demo venues. Empty DB
 * means manual entry + Explore, honestly.
 */

export function ScanPage() {
  const [, nav] = useLocation();
  const { session, setSession } = useStay();
  const { t } = useLocale();
  const { version, remoteLoaded } = useListings();
  const quickPlaces = useMemo(() => activePlaces().slice(0, 6), [version]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [denied, setDenied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
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
                toast.message("Unknown code");
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    void triggerHaptic("medium");

    // Pure room numbers resolve inside the current stay only — never a
    // hardcoded demo property.
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
    } else {
      toast.error("Code not recognised. Try entering a room number, @handle, or invite code.");
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col px-4 pb-12">
      <div className="relative mt-2 overflow-hidden rounded-[28px] bg-ink">
        <video ref={videoRef} className="h-64 w-full object-cover md:h-80" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        {!live && (
          <div className="absolute inset-0 grid content-center justify-items-center gap-2 px-6 text-center text-sm text-white/70">
            <span>{denied ? t("cameraOff") : t("openingCamera")}</span>
            {denied && (
              <>
                <p className="max-w-xs text-xs text-white/60">
                  Allow camera access in your browser settings, or use the code box below — room
                  numbers, @handles, and invite codes work without the camera, even offline.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDenied(false);
                    setCameraAttempt((n) => n + 1);
                  }}
                  className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  Try camera again
                </button>
              </>
            )}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-40 w-40 rounded-3xl border-2 border-white/80" />
        </div>
      </div>

      {/* Manual Code / PIN Entry */}
      <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Enter room # (e.g. 101), invite code, or @handle..."
          className="h-11 flex-1 rounded-2xl bg-card px-4 text-xs md:text-sm font-medium text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand placeholder:text-mute"
        />
        <button
          type="submit"
          className="h-11 rounded-2xl bg-brand px-4 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-brand-ink transition shrink-0"
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
                className="relative h-28 overflow-hidden rounded-3xl bg-ink"
              >
                {p.heroImage && (
                  <img src={p.heroImage} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="hero-scrim absolute inset-0" />
                <span className="absolute inset-x-0 bottom-3 px-2 text-center font-display text-[16px] text-white">{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
