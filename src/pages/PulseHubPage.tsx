import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coffee,
  Download,
  Headphones,
  Hotel,
  PartyPopper,
  QrCode,
  Scissors,
  Star,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageField } from "@/components/media/ImageField";
import { Photo } from "@/components/ui/Photo";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
import {
  acknowledgePulseIssue,
  averagePrimaryScore,
  createPulse,
  publishPulse,
  resolvePulseIssue,
  subscribePropertyPulseIssues,
  subscribePropertyPulseResponses,
  subscribePropertyPulses,
  type PropertyPulse,
} from "@/lib/pulse-store";
import {
  activeLivePulse,
  buildPulsePublicUrl,
  pulseResponsesToCsv,
  scoreDistribution,
  type PulseIssue,
  type PulseResponse,
  type PulseTemplate,
} from "@shared/pulse";
import { playResolutionChime } from "@/lib/ticket-alert-sound";
import { PulseQrCard } from "@/components/pulse/PulseQrCard";
import { PulseIssueCard } from "@/components/pulse/PulseIssueCard";
import { PrintStandeeModal } from "@/components/pulse/PrintStandeeModal";
import { cn } from "@/lib/cn";

interface TemplateOption {
  id: PulseTemplate;
  title: string;
  category: string;
  icon: typeof Coffee;
  description: string;
  defaultTitle: string;
  defaultPlacement: string;
  sampleQuestions: string[];
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "dining_cafe",
    title: "Dining & Cafe",
    category: "Food & Beverage",
    icon: Coffee,
    description: "Ideal for cafes, restaurants, bars & food popups.",
    defaultTitle: "How was your food & dining experience?",
    defaultPlacement: "Table card",
    sampleQuestions: ["How was your food & service?", "What went wrong? (Food / Service / Speed)", "Manager follow-up"],
  },
  {
    id: "stay_during",
    title: "Stay & Hospitality",
    category: "Accommodations",
    icon: Hotel,
    description: "For hotels, boutique stays, Airbnbs & serviced rooms.",
    defaultTitle: "How is your stay?",
    defaultPlacement: "Room keycard / Bedside",
    sampleQuestions: ["How is your stay?", "What went wrong? (Cleanliness / AC / Noise)", "Front-desk assistance"],
  },
  {
    id: "event_experience",
    title: "Events & Meetups",
    category: "Experiences",
    icon: PartyPopper,
    description: "For workshops, festivals, gigs, classes & DJ nights.",
    defaultTitle: "How was the event today?",
    defaultPlacement: "Screen / Badge / Exit",
    sampleQuestions: ["How was the vibe & event?", "What could be improved?", "Next event updates"],
  },
  {
    id: "service_retail",
    title: "Services & Salons",
    category: "Personal Services",
    icon: Scissors,
    description: "For hair salons, barber shops, spas, clinics & retail.",
    defaultTitle: "How was your service today?",
    defaultPlacement: "Checkout counter",
    sampleQuestions: ["How was your service?", "Issue (Wait time / Quality / Staff)", "Resolution request"],
  },
  {
    id: "general_csat",
    title: "Universal CSAT",
    category: "General Feedback",
    icon: Star,
    description: "Universal 1–5 customer satisfaction for any business or creator.",
    defaultTitle: "How was your experience with us?",
    defaultPlacement: "Feedback card",
    sampleQuestions: ["How was your experience?", "What can we improve?", "Direct contact"],
  },
];

const EMOJIS = [
  { emoji: "😠", label: "Terrible", score: 1, color: "text-red-500" },
  { emoji: "😕", label: "Poor", score: 2, color: "text-amber-500" },
  { emoji: "😐", label: "Okay", score: 3, color: "text-yellow-500" },
  { emoji: "🙂", label: "Good", score: 4, color: "text-blue-500" },
  { emoji: "😍", label: "Amazing", score: 5, color: "text-emerald-500" },
];

function Metric({
  label,
  icon,
  value,
  sub,
  valueClass,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-mute">{label}</span>
        {icon}
      </div>
      <p className={cn("font-display mt-2 text-2xl font-bold text-ink", valueClass)}>{value}</p>
      <p className="mt-0.5 text-[10px] text-mute">{sub}</p>
    </div>
  );
}

export function PulseHubPage() {
  const { user } = useAuth();
  const [, nav] = useLocation();

  const workspaceId = useMemo(() => {
    if (!user) return "demo_workspace";
    if (user.propertyIds && user.propertyIds.length > 0) return user.propertyIds[0]!;
    return `usr_${user.uid}`;
  }, [user]);

  const [selectedTemplate, setSelectedTemplate] = useState<PulseTemplate>("dining_cafe");
  const [pulseName, setPulseName] = useState("");
  const [pulseTitle, setPulseTitle] = useState(TEMPLATES[0]!.defaultTitle);
  const [placementLabel, setPlacementLabel] = useState(TEMPLATES[0]!.defaultPlacement);
  const [pulseImage, setPulseImage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [issues, setIssues] = useState<PulseIssue[]>([]);
  const [pulses, setPulses] = useState<PropertyPulse[]>([]);

  const [activePublicToken, setActivePublicToken] = useState<string | null>(null);
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);
  const [previewRating, setPreviewRating] = useState<number>(5);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [resolutionNoteByIssue, setResolutionNoteByIssue] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!workspaceId || workspaceId === "demo_workspace") return;
    const unsubResponses = subscribePropertyPulseResponses(workspaceId, setResponses);
    const unsubIssues = subscribePropertyPulseIssues(workspaceId, setIssues);
    const unsubPulses = subscribePropertyPulses(workspaceId, setPulses);
    return () => {
      unsubResponses();
      unsubIssues();
      unsubPulses();
    };
  }, [workspaceId]);

  useEffect(() => {
    const current = TEMPLATES.find((t) => t.id === selectedTemplate);
    if (current) {
      setPulseTitle(current.defaultTitle);
      setPlacementLabel(current.defaultPlacement);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!activePublicToken) {
      setActiveQrUrl(null);
      return;
    }
    const publicUrl = buildPulsePublicUrl(activePublicToken, publicSiteOrigin());
    void makeQrDataUrl(publicUrl).then(setActiveQrUrl);
  }, [activePublicToken]);

  const avgScore = useMemo(() => averagePrimaryScore(responses), [responses]);
  const openIssues = useMemo(() => issues.filter((i) => i.status !== "resolved"), [issues]);
  const resolvedIssues = useMemo(() => issues.filter((i) => i.status === "resolved"), [issues]);
  const scoreCounts = useMemo(() => scoreDistribution(responses), [responses]);
  const totalRated = responses.length || 1;
  const livePulse = useMemo(() => activeLivePulse(pulses), [pulses]);

  useEffect(() => {
    if (livePulse?.activePublicToken) {
      setActivePublicToken(livePulse.activePublicToken);
    }
  }, [livePulse]);

  async function handleCreateAndPublish() {
    if (!user) {
      toast.info("Please sign in or create an AirPal account first");
      nav("/start?tab=signup");
      return;
    }
    setBusy(true);
    try {
      const name = pulseName.trim() || `${TEMPLATES.find((t) => t.id === selectedTemplate)?.title || "Pulse"}`;
      const created = await createPulse(
        workspaceId,
        selectedTemplate,
        name,
        pulseTitle.trim() || undefined,
        pulseImage || undefined,
      );
      const pub = await publishPulse(workspaceId, created.pulseId, "other", placementLabel.trim() || "QR Card");

      setActivePublicToken(pub.publicToken);
      void track("content_publish", { contextId: workspaceId, contentType: "pulse" });
      toast.success("Pulse created & QR code generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create Pulse");
    } finally {
      setBusy(false);
    }
  }

  function handleCopyLink() {
    if (!activePublicToken) return;
    const url = buildPulsePublicUrl(activePublicToken, publicSiteOrigin());
    void navigator.clipboard.writeText(url);
    toast.success("Public Pulse link copied to clipboard!");
  }

  function handleDownloadCsv() {
    if (!responses.length) {
      toast.info("No responses to export yet");
      return;
    }
    const csv = pulseResponsesToCsv(responses);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airpal-pulse-${workspaceId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  }

  async function handleAcknowledge(issueId: string) {
    try {
      await acknowledgePulseIssue(workspaceId, issueId);
      toast.success("Issue acknowledged");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to acknowledge");
    }
  }

  async function handleResolve(issueId: string) {
    const note = resolutionNoteByIssue[issueId]?.trim();
    try {
      playResolutionChime();
      await resolvePulseIssue(workspaceId, issueId, note || undefined);
      toast.success("Issue marked resolved & closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
        AirPal Pulse · Real-Time Feedback
      </p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
        Catch unhappy guests <span className="text-brand">before bad reviews</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
        Real-time QR ratings for cafes, restaurants, hotels, events, and venues. Negative feedback routes to your
        manager desk instantly — zero app download required.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            document.getElementById("pulse-builder")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Create Your Free Pulse
          <ArrowRight size={15} aria-hidden />
        </Button>
        <Link
          href="/helpdesk"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-paper"
        >
          <Headphones size={15} className="text-brand" aria-hidden />
          <span>Universal Help Desk</span>
        </Link>
      </div>

      <div className="mt-10 space-y-12">
        <section id="pulse-builder" className="scroll-mt-6 space-y-6">
          <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Pulse Studio</h2>
              <p className="text-xs text-mute sm:text-sm">
                Select your industry blueprint, customize the header question, and deploy a live QR code in 10 seconds.
              </p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/25">
              1-Click Deploy
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">1. Select Industry Blueprint</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pulse template">
                  {TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={cn(
                          "rounded-2xl p-3.5 text-left text-sm ring-1 transition-colors",
                          isSelected ? "bg-brand/5 shadow-xs ring-2 ring-brand" : "bg-card ring-line hover:bg-paper",
                        )}
                      >
                        <div className="flex items-center gap-2.5 font-bold text-ink">
                          <div
                            className={cn(
                              "rounded-xl p-2",
                              isSelected ? "bg-brand text-white" : "bg-paper text-brand ring-1 ring-line",
                            )}
                          >
                            <Icon size={16} aria-hidden />
                          </div>
                          <span className="text-xs font-bold">{tmpl.title}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-mute line-clamp-2">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">
                  2. Customize Question & Placement
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink" htmlFor="pulse-name">
                      Business or Pulse Name
                    </label>
                    <input
                      id="pulse-name"
                      type="text"
                      value={pulseName}
                      onChange={(e) => setPulseName(e.target.value)}
                      placeholder="e.g. Surry Hills Cafe & Bar, Table 12, Harbour Hotel Room 302"
                      className="h-11 w-full rounded-2xl bg-paper px-4 text-xs text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand/40 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink" htmlFor="pulse-title">
                      Header Question / Customer Prompt
                    </label>
                    <input
                      id="pulse-title"
                      type="text"
                      value={pulseTitle}
                      onChange={(e) => setPulseTitle(e.target.value)}
                      placeholder="e.g. How was your food & dining experience today?"
                      className="h-11 w-full rounded-2xl bg-paper px-4 text-xs text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand/40 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink" htmlFor="pulse-placement">
                      Physical Placement Tag
                    </label>
                    <input
                      id="pulse-placement"
                      type="text"
                      value={placementLabel}
                      onChange={(e) => setPlacementLabel(e.target.value)}
                      placeholder="e.g. Table card, Bedside stand, Receipt footer, Entrance banner"
                      className="h-11 w-full rounded-2xl bg-paper px-4 text-xs text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand/40 sm:text-sm"
                    />
                  </div>

                  <ImageField
                    kind="cover"
                    folder="listings"
                    label="Cover image (optional)"
                    value={pulseImage}
                    onChange={(src) => setPulseImage(src)}
                  />
                </div>

                <Button onClick={handleCreateAndPublish} disabled={busy} className="mt-2 w-full">
                  {busy ? "Minting QR & Link…" : "Generate Live Pulse & QR Code"}
                </Button>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-mute">3. Live guest preview</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden />
                  Live Reactive
                </span>
              </div>

              <div className="mx-auto max-w-sm rounded-[32px] bg-card p-4 shadow-xl ring-2 ring-line">
                <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-line" aria-hidden />
                {pulseImage ? (
                  <div className="relative mb-4 h-28 overflow-hidden rounded-2xl ring-1 ring-line">
                    <Photo src={pulseImage} alt="" className="h-full w-full object-cover" />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                        {pulseName.trim() || "Your Business"}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-4 rounded-2xl bg-paper/80 p-4 ring-1 ring-line">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                      {pulseName.trim() || "Your Business"}
                    </span>
                    <h3 className="text-sm font-bold text-ink">{pulseTitle.trim() || "How was your experience?"}</h3>
                  </div>

                  <div className="flex items-center justify-between gap-1 rounded-2xl bg-card p-2 ring-1 ring-line">
                    {EMOJIS.map((item) => {
                      const active = previewRating === item.score;
                      return (
                        <button
                          key={item.score}
                          type="button"
                          onClick={() => setPreviewRating(item.score)}
                          aria-pressed={active}
                          aria-label={`Preview ${item.label} rating`}
                          className={cn(
                            "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-xl p-1.5 transition-colors",
                            active ? "bg-brand/15 ring-2 ring-brand" : "opacity-75 hover:bg-paper",
                          )}
                        >
                          <span className="text-2xl" aria-hidden>
                            {item.emoji}
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold text-mute">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {previewRating <= 2 ? (
                    <div className="space-y-2 rounded-2xl bg-amber-500/10 p-3.5 text-xs ring-1 ring-amber-500/30 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <AlertCircle size={16} className="shrink-0" aria-hidden />
                        <span>Service Recovery Active</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink/80">
                        Guest rates ≤ 2 → Prompts for issue categories (Food, Service, Speed, Noise) and immediately
                        notifies front desk / manager.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl bg-emerald-500/10 p-3.5 text-xs ring-1 ring-emerald-500/30 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <ThumbsUp size={16} className="shrink-0" aria-hidden />
                        <span>Promoter Boost Active</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink/80">
                        Guest rates ≥ 4 → Offers 1-click Google Review boost, tip option, or VIP club invite.
                      </p>
                    </div>
                  )}

                  <div className="pt-1 text-center">
                    <span className="text-[10px] text-mute">Powered by AirPal Pulse · Zero App Needed</span>
                  </div>
                </div>
              </div>

              {activePublicToken && activeQrUrl && (
                <PulseQrCard
                  qrUrl={activeQrUrl}
                  publicUrl={buildPulsePublicUrl(activePublicToken, publicSiteOrigin())}
                  onCopyLink={handleCopyLink}
                  onPrint={() => setShowPrintModal(true)}
                />
              )}
            </div>
          </div>
        </section>

        <section id="pulse-live-hub" className="space-y-6 border-t border-line pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display flex items-center gap-2.5 text-2xl font-bold tracking-tight">
                <Activity size={24} className="text-brand" aria-hidden />
                <span>Live Feedback & Recovery Hub</span>
              </h2>
              <p className="text-xs text-mute sm:text-sm">
                Real-time incoming customer ratings, sentiment analysis, and service recovery tickets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outlined" size="sm" onClick={handleDownloadCsv}>
                <Download size={14} aria-hidden />
                Export CSV
              </Button>
              <Link
                href="/helpdesk"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand/90"
              >
                <Headphones size={14} aria-hidden />
                Help Desk Console
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Total Responses"
              icon={<QrCode size={16} className="text-brand" aria-hidden />}
              value={responses.length}
              sub="Scanned & submitted"
            />
            <Metric
              label="Average Score"
              icon={<TrendingUp size={16} className="text-emerald-500" aria-hidden />}
              value={avgScore != null ? `${avgScore.toFixed(1)} / 5.0` : "5.0"}
              valueClass="text-brand"
              sub="Customer satisfaction"
            />
            <Metric
              label="Open Tickets"
              icon={<AlertCircle size={16} className="text-rose-500" aria-hidden />}
              value={openIssues.length}
              valueClass={openIssues.length > 0 ? "text-rose-600 motion-safe:animate-pulse" : undefined}
              sub="Awaiting staff recovery"
            />
            <Metric
              label="Resolved Cases"
              icon={<CheckCircle2 size={16} className="text-emerald-500" aria-hidden />}
              value={resolvedIssues.length}
              valueClass="text-emerald-600 dark:text-emerald-400"
              sub="Successfully closed"
            />
          </div>

          {responses.length > 0 && (
            <div className="space-y-3 rounded-[28px] bg-card p-5 ring-1 ring-line shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mute">Satisfaction Distribution</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = scoreCounts[rating as keyof typeof scoreCounts] || 0;
                  const pct = Math.round((count / totalRated) * 100);
                  const emoji = EMOJIS.find((e) => e.score === rating)?.emoji || "⭐";
                  return (
                    <div key={rating} className="flex items-center gap-3 text-xs">
                      <span className="flex w-12 items-center gap-1 font-semibold text-ink">
                        <span aria-hidden>{emoji}</span> {rating}★
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500",
                            rating >= 4 ? "bg-emerald-500" : rating === 3 ? "bg-amber-500" : "bg-rose-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-mute">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-display flex items-center gap-2 text-base font-bold">
              <AlertCircle size={20} className="text-rose-500" aria-hidden />
              <span>Service Recovery Queue ({openIssues.length})</span>
            </h3>

            {openIssues.length === 0 ? (
              <div className="space-y-2 rounded-[28px] bg-card p-8 text-center ring-1 ring-line shadow-2xs">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" aria-hidden />
                <div className="font-bold text-ink">All Clear! No Open Issues</div>
                <p className="mx-auto max-w-sm text-xs text-mute">
                  When guests submit ratings ≤ 2 or request contact, tickets appear here and in the Help Desk in real
                  time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {openIssues.map((issue) => (
                  <PulseIssueCard
                    key={issue.id}
                    issue={issue}
                    note={resolutionNoteByIssue[issue.id] || ""}
                    onNoteChange={(value) => setResolutionNoteByIssue({ ...resolutionNoteByIssue, [issue.id]: value })}
                    onAcknowledge={() => handleAcknowledge(issue.id)}
                    onResolve={() => handleResolve(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showPrintModal && activeQrUrl && (
        <PrintStandeeModal
          qrUrl={activeQrUrl}
          businessName={pulseName.trim() || "Your Place"}
          title={pulseTitle.trim() || "How was your experience today?"}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
