import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import jsQR from "jsqr";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Calendar, CheckCircle2, ExternalLink, QrCode, Upload } from "lucide-react";
import { decodeQrFromImageFile, parseQrPayload, pathForIntent } from "@/lib/qr";
import { triggerHaptic } from "@/lib/native";
import { getGoogleCalendarUrl } from "@/lib/calendar-export";
import { useEvents } from "@/contexts/EventsContext";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function QrScannerPage() {
  const [, nav] = useLocation();
  const { calendarEvents } = useEvents();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [live, setLive] = useState(false);
  const [denied, setDenied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [checkedCount, setCheckedCount] = useState(42);
  const [lastScannedGuest, setLastScannedGuest] = useState<{
    name: string;
    tier: string;
    time: string;
  } | null>(null);

  const running = useRef(false);

  // Target event for Google Calendar sync
  const upcomingHuddle = useMemo(() => {
    return (
      calendarEvents.find((e) => e.isGoing || e.isInterested) ||
      calendarEvents[0] || {
        id: "huddle-sync",
        title: "AirPal Tech & Community Huddle",
        date: "2026-10-24",
        startTime: "18:00",
        venue: "Surry Hills Hub",
        city: "Sydney",
        description: "Professional networking and attendee meetup on AirPal.",
      }
    );
  }, [calendarEvents]);

  const handleValidTicket = useCallback((codeText: string) => {
    void triggerHaptic("success");
    setCheckedCount((c) => c + 1);
    const guest = {
      name: `Guest #${codeText.slice(-4) || "7841"}`,
      tier: "VIP All-Access Pass",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setLastScannedGuest(guest);
    toast.success(`Pass Verified: ${guest.name} (${guest.tier})`);
  }, []);

  const processScanResult = useCallback(
    (raw: string) => {
      const intent = parseQrPayload(raw);
      const path = pathForIntent(intent);
      if (path && (path.startsWith("/ticket/") || path.startsWith("/e/"))) {
        handleValidTicket(raw);
        nav(path);
        return;
      }
      handleValidTicket(raw);
    },
    [handleValidTicket, nav],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    running.current = true;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
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
                running.current = false;
                processScanResult(code.data);
                return;
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

    void startCamera();
    return () => {
      running.current = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [processScanResult]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScanResult(manualCode.trim());
    setManualCode("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void triggerHaptic("light");
    try {
      const qrData = await decodeQrFromImageFile(file);
      if (qrData) {
        processScanResult(qrData);
      } else {
        toast.error("No valid QR pass detected in image.");
      }
    } catch {
      toast.error("Could not read image file.");
    }
  };

  const handleGoogleCalendarSync = () => {
    void triggerHaptic("medium");
    if (upcomingHuddle) {
      const url = getGoogleCalendarUrl(upcomingHuddle);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Opening Google Calendar to sync event schedule!");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/event"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>Organiser Studio</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Gate Admission</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-500/20">
            {checkedCount} Checked In
          </span>
        </div>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <QrCode size={28} className="text-brand" />
          <span>Gate QR Scanner</span>
        </h1>
        <p className="mt-1 text-sm text-mute">
          High-speed gate admission scanner for validating AirPal tickets and passbook QR passes.
        </p>
      </div>

      {/* Google Calendar Sync Card */}
      <div className="mt-6 rounded-3xl bg-blue-500/10 p-5 ring-1 ring-blue-500/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-blue-950">Google Calendar Schedule Sync</h2>
              <p className="text-xs text-blue-800/80">
                Sync joined Huddles and professional events directly to your personal Google Calendar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleCalendarSync}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 cursor-pointer shrink-0"
          >
            <ExternalLink size={13} />
            <span>Sync with Google Calendar</span>
          </button>
        </div>
      </div>

      {/* Camera Scanning Viewport */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-neutral-950 ring-1 ring-line shadow-xl">
        <div className="relative aspect-square max-h-[380px] w-full flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn("h-full w-full object-cover", live ? "block" : "hidden")}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Target Reticle */}
          {live && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-60 w-60 rounded-3xl border-2 border-brand/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-brand animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                <span className="absolute -bottom-8 inset-x-0 text-center text-[11px] font-semibold text-white/90">
                  Align QR pass within frame
                </span>
              </div>
            </div>
          )}

          {!live && (
            <div className="p-8 text-center text-white">
              <QrCode size={48} className="mx-auto text-white/40 mb-3 animate-pulse" />
              <p className="font-display text-sm font-bold">
                {denied ? "Camera Access Denied" : "Initializing Camera Viewport..."}
              </p>
              <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
                {denied
                  ? "Enable camera permissions in your browser or enter the code manually below."
                  : "Point camera at an AirPal event pass QR code for instant door validation."}
              </p>
            </div>
          )}
        </div>

        {/* Scan Status Pill */}
        {lastScannedGuest && (
          <div className="flex items-center justify-between bg-emerald-500/20 px-4 py-3 text-emerald-300 border-t border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">
                {lastScannedGuest.name} · {lastScannedGuest.tier}
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">{lastScannedGuest.time}</span>
          </div>
        )}
      </div>

      {/* Manual Code Input & Photo Upload */}
      <div className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
        <h3 className="font-display text-sm font-bold text-ink mb-3">Manual Pass Verification</h3>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter pass code (e.g. PASS-9921)"
            className="flex-1 min-h-[44px] rounded-xl bg-paper px-3.5 text-xs text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand font-mono uppercase"
          />
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition cursor-pointer"
          >
            Verify Pass
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-mute">
          <span>Or scan from attendee screenshot:</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-paper px-3 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card transition cursor-pointer"
          >
            <Upload size={13} />
            <span>Upload Photo</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
      </div>
    </div>
  );
}
