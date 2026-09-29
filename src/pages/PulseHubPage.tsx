import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coffee,
  Copy,
  Download,
  ExternalLink,
  Headphones,
  Hotel,
  PartyPopper,
  Printer,
  QrCode,
  Scissors,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  buildPulsePublicUrl,
  pulseResponsesToCsv,
  type PulseIssue,
  type PulseResponse,
  type PulseTemplate,
} from "@shared/pulse";
import { playResolutionChime } from "@/lib/ticket-alert-sound";

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

export function PulseHubPage() {
  const { user } = useAuth();
  const [, nav] = useLocation();

  // Active workspace (either assigned property or personal user workspace)
  const workspaceId = useMemo(() => {
    if (!user) return "demo_workspace";
    if (user.propertyIds && user.propertyIds.length > 0) return user.propertyIds[0]!;
    return `usr_${user.uid}`;
  }, [user]);

  // Creator state
  const [selectedTemplate, setSelectedTemplate] = useState<PulseTemplate>("dining_cafe");
  const [pulseName, setPulseName] = useState("");
  const [pulseTitle, setPulseTitle] = useState(TEMPLATES[0]!.defaultTitle);
  const [placementLabel, setPlacementLabel] = useState(TEMPLATES[0]!.defaultPlacement);
  const [busy, setBusy] = useState(false);

  // Live Pulses & Responses
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [issues, setIssues] = useState<PulseIssue[]>([]);
  const [pulses, setPulses] = useState<PropertyPulse[]>([]);

  // Generated QR & Modal State
  const [activePublicToken, setActivePublicToken] = useState<string | null>(null);
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);
  const [previewRating, setPreviewRating] = useState<number>(5);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Issue action notes
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

  // Score distribution calculation
  const scoreCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    responses.forEach((r) => {
      const p = r.primaryScore;
      if (p && p >= 1 && p <= 5) {
        counts[p as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [responses]);

  const totalRated = responses.length || 1;

  const activeLivePulse = useMemo(() => {
    return pulses.find((p) => p.status === "live") || pulses[0];
  }, [pulses]);

  useEffect(() => {
    if (activeLivePulse?.activePublicToken) {
      setActivePublicToken(activeLivePulse.activePublicToken);
    }
  }, [activeLivePulse]);

  async function handleCreateAndPublish() {
    if (!user) {
      toast.info("Please sign in or create an AirPal account first");
      nav("/start?tab=signup");
      return;
    }
    setBusy(true);
    try {
      const name = pulseName.trim() || `${TEMPLATES.find((t) => t.id === selectedTemplate)?.title || "Pulse"}`;
      const created = await createPulse(workspaceId, selectedTemplate, name, pulseTitle.trim() || undefined);
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
    <div className="min-h-screen bg-bg text-ink pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand/12 via-card/60 to-bg pt-12 pb-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-semibold ring-1 ring-brand/30 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>AirPal Pulse · Real-Time In-Venue Feedback Engine</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink">
            Catch Unhappy Guests <span className="text-brand">Before Bad Reviews</span>
          </h1>

          <p className="text-sm sm:text-base text-ink/75 max-w-2xl mx-auto leading-relaxed">
            Real-time QR ratings for cafes, restaurants, hotels, events, and venues. 
            Automated service recovery gates negative feedback to your manager desk instantly—zero app download required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => {
                const el = document.getElementById("pulse-builder");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-brand text-white hover:bg-brand/90 h-11 px-6 font-semibold shadow-xs"
            >
              Create Your Free Pulse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link
              href="/helpdesk"
              className="inline-flex items-center gap-2 rounded-2xl bg-card px-5 h-11 text-sm font-semibold text-ink ring-1 ring-line shadow-2xs hover:bg-paper transition"
            >
              <Headphones className="w-4 h-4 text-brand" />
              <span>Universal Help Desk</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Pulse Builder Studio */}
        <section id="pulse-builder" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Pulse Studio</h2>
              <p className="text-xs sm:text-sm text-mute">
                Select your industry blueprint, customize the header question, and deploy a live QR code in 10 seconds.
              </p>
            </div>
            <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full ring-1 ring-brand/25">
              1-Click Deploy
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form & Configuration */}
            <div className="lg:col-span-7 space-y-6">
              {/* Template Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-mute">
                  1. Select Industry Blueprint
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        aria-pressed={isSelected}
                        className={`text-left p-3.5 rounded-2xl ring-1 transition-all text-sm ${
                          isSelected
                            ? "ring-2 ring-brand bg-brand/5 shadow-xs"
                            : "ring-line bg-card hover:bg-paper"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 font-bold text-ink">
                          <div className={`p-2 rounded-xl ${isSelected ? "bg-brand text-white" : "bg-paper text-brand ring-1 ring-line"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold">{tmpl.title}</span>
                        </div>
                        <p className="text-[11px] text-mute mt-2 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customizer */}
              <div className="p-5 rounded-[28px] bg-card/90 ring-1 ring-line space-y-4 shadow-xs">
                <label className="text-xs font-bold uppercase tracking-wider text-mute">
                  2. Customize Question & Placement
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Business or Pulse Name
                    </label>
                    <input
                      type="text"
                      value={pulseName}
                      onChange={(e) => setPulseName(e.target.value)}
                      placeholder="e.g. Surry Hills Cafe & Bar, Table 12, Harbour Hotel Room 302"
                      className="w-full h-11 px-4 rounded-2xl bg-paper ring-1 ring-line text-xs sm:text-sm text-ink outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Header Question / Customer Prompt
                    </label>
                    <input
                      type="text"
                      value={pulseTitle}
                      onChange={(e) => setPulseTitle(e.target.value)}
                      placeholder="e.g. How was your food & dining experience today?"
                      className="w-full h-11 px-4 rounded-2xl bg-paper ring-1 ring-line text-xs sm:text-sm text-ink outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Physical Placement Tag
                    </label>
                    <input
                      type="text"
                      value={placementLabel}
                      onChange={(e) => setPlacementLabel(e.target.value)}
                      placeholder="e.g. Table card, Bedside stand, Receipt footer, Entrance banner"
                      className="w-full h-11 px-4 rounded-2xl bg-paper ring-1 ring-line text-xs sm:text-sm text-ink outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateAndPublish}
                  disabled={busy}
                  className="w-full bg-brand text-white hover:bg-brand/90 h-11 text-sm font-semibold mt-2 shadow-xs"
                >
                  {busy ? "Minting QR & Link…" : "Generate Live Pulse & QR Code"}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Guest Mobile Preview Card */}
            <div className="lg:col-span-5 space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-mute">
                  Interactive Guest Mobile Preview
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                  Live Reactive
                </span>
              </div>

              {/* Mobile Mockup Frame */}
              <div className="p-4 rounded-[32px] bg-card ring-2 ring-line shadow-xl max-w-sm mx-auto">
                <div className="w-12 h-1 bg-line rounded-full mx-auto mb-4" />
                <div className="p-4 rounded-2xl bg-paper/80 ring-1 ring-line space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                      {pulseName.trim() || "Your Business"}
                    </span>
                    <h3 className="text-sm font-bold text-ink">
                      {pulseTitle.trim() || "How was your experience?"}
                    </h3>
                  </div>

                  {/* Emoji Rating Row */}
                  <div className="flex items-center justify-between gap-1 p-2 bg-card rounded-2xl ring-1 ring-line">
                    {EMOJIS.map((item) => {
                      const active = previewRating === item.score;
                      return (
                        <button
                          key={item.score}
                          type="button"
                          onClick={() => setPreviewRating(item.score)}
                          className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                            active
                              ? "bg-brand/15 scale-110 ring-1 ring-brand"
                              : "hover:bg-paper opacity-75"
                          }`}
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          <span className="text-[9px] font-semibold text-mute mt-0.5">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic conditional reveal preview */}
                  {previewRating <= 2 ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Service Recovery Active</span>
                      </div>
                      <p className="text-ink/80 text-[11px] leading-relaxed">
                        Guest rates $\le 2$ $\rightarrow$ Prompts for issue categories (Food, Service, Speed, Noise) and immediately notifies front desk / manager.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                        <ThumbsUp className="w-4 h-4 shrink-0" />
                        <span>Promoter Boost Active</span>
                      </div>
                      <p className="text-ink/80 text-[11px] leading-relaxed">
                        Guest rates $\ge 4$ $\rightarrow$ Offers 1-click Google Review boost, tip option, or VIP club invite.
                      </p>
                    </div>
                  )}

                  <div className="text-center pt-1">
                    <span className="text-[10px] text-mute">Powered by AirPal Pulse · Zero App Needed</span>
                  </div>
                </div>
              </div>

              {/* QR Code Action Output */}
              {activePublicToken && activeQrUrl && (
                <div className="p-5 rounded-[28px] bg-emerald-500/10 ring-1 ring-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={activeQrUrl}
                      alt="Pulse QR"
                      className="w-20 h-20 rounded-xl ring-1 ring-line bg-white p-1.5 shadow-2xs"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Live QR Ready for Print & Placement
                      </div>
                      <div className="text-[11px] font-mono text-mute truncate">
                        {buildPulsePublicUrl(activePublicToken, publicSiteOrigin())}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
                        >
                          <Copy className="w-3 h-3" /> Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPrintModal(true)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
                        >
                          <Printer className="w-3 h-3" /> Print Standee
                        </button>
                        <a
                          href={buildPulsePublicUrl(activePublicToken, publicSiteOrigin())}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-brand hover:underline"
                        >
                          Test View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Live Feedback Dashboard & Issues Hub */}
        <section id="pulse-live-hub" className="space-y-6 pt-6 border-t border-line">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2.5">
                <Activity className="w-6 h-6 text-brand" />
                <span>Live Feedback & Recovery Hub</span>
              </h2>
              <p className="text-xs sm:text-sm text-mute">
                Real-time incoming customer ratings, sentiment analysis, and service recovery tickets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outlined" size="sm" onClick={handleDownloadCsv} className="min-h-[44px] rounded-full text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
              <Link
                href="/helpdesk"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 min-h-[44px] text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
              >
                <Headphones className="w-3.5 h-3.5" />
                Help Desk Console
              </Link>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card ring-1 ring-line shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Total Responses</span>
                <QrCode size={16} className="text-brand" />
              </div>
              <p className="font-display text-2xl font-bold text-ink mt-2">{responses.length}</p>
              <p className="text-[10px] text-mute mt-0.5">Scanned & submitted</p>
            </div>

            <div className="p-4 rounded-2xl bg-card ring-1 ring-line shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Average Score</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <p className="font-display text-2xl font-bold text-brand mt-2">
                {avgScore != null ? `${avgScore.toFixed(1)} / 5.0` : "5.0"}
              </p>
              <p className="text-[10px] text-mute mt-0.5">Customer satisfaction</p>
            </div>

            <div className="p-4 rounded-2xl bg-card ring-1 ring-line shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Open Tickets</span>
                <AlertCircle size={16} className="text-rose-500" />
              </div>
              <p className={`font-display text-2xl font-bold mt-2 ${openIssues.length > 0 ? "text-rose-600 motion-safe:animate-pulse" : "text-ink"}`}>
                {openIssues.length}
              </p>
              <p className="text-[10px] text-mute mt-0.5">Awaiting staff recovery</p>
            </div>

            <div className="p-4 rounded-2xl bg-card ring-1 ring-line shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Resolved Cases</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {resolvedIssues.length}
              </p>
              <p className="text-[10px] text-mute mt-0.5">Successfully closed</p>
            </div>
          </div>

          {/* Rating Breakdown Strip */}
          {responses.length > 0 && (
            <div className="p-5 rounded-[28px] bg-card ring-1 ring-line shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mute">Satisfaction Distribution</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = scoreCounts[rating as keyof typeof scoreCounts] || 0;
                  const pct = Math.round((count / totalRated) * 100);
                  const emoji = EMOJIS.find((e) => e.score === rating)?.emoji || "⭐";
                  return (
                    <div key={rating} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-semibold text-ink flex items-center gap-1">
                        <span>{emoji}</span> {rating}★
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-paper ring-1 ring-line overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rating >= 4 ? "bg-emerald-500" : rating === 3 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-mute">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Issues Action Board */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Service Recovery Queue ({openIssues.length})</span>
              </h3>
            </div>

            {openIssues.length === 0 ? (
              <div className="p-8 rounded-[28px] bg-card ring-1 ring-line text-center space-y-2 shadow-2xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="font-bold text-ink">All Clear! No Open Issues</div>
                <p className="text-xs text-mute max-w-sm mx-auto">
                  When guests submit ratings $\le 2$ or request contact, tickets appear here and in the Help Desk in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openIssues.map((issue) => (
                  <div key={issue.id} className="p-5 rounded-[28px] bg-card ring-1 ring-line space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/15 text-red-600 dark:text-red-400">
                        {issue.category} · Score {issue.primaryScore ?? "?"}/5
                      </span>
                      <span className="text-xs text-mute">{issue.status}</span>
                    </div>

                    <div className="font-semibold text-sm text-ink leading-relaxed">{issue.summary}</div>

                    {issue.contactRequested && (
                      <div className="text-xs bg-paper p-3 rounded-xl ring-1 ring-line space-y-1">
                        <div className="font-semibold text-brand">Guest Requested Contact:</div>
                        <div>Name: {issue.contactName || "Guest"}</div>
                        <div>Method: {issue.contactMethod || "Not provided"}</div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-line">
                      {issue.status === "open" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(issue.id)}
                          className="w-full rounded-full bg-paper min-h-[44px] text-xs font-semibold text-mute hover:text-ink ring-1 ring-line transition"
                        >
                          Acknowledge Issue
                        </button>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Resolution note (e.g. comped drink, apologized)"
                          value={resolutionNoteByIssue[issue.id] || ""}
                          onChange={(e) =>
                            setResolutionNoteByIssue({ ...resolutionNoteByIssue, [issue.id]: e.target.value })
                          }
                          className="flex-1 h-11 px-4 rounded-full bg-paper ring-1 ring-line text-xs text-ink outline-none focus:ring-2 focus:ring-brand/40"
                        />
                        <button
                          type="button"
                          onClick={() => handleResolve(issue.id)}
                          className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px] text-xs font-semibold px-4 shadow-xs transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Printable QR Standee Modal */}
      {showPrintModal && activeQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-[32px] bg-white text-zinc-900 p-8 shadow-2xl space-y-6 text-center">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-zinc-400 hover:text-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#1805db]">
                AirPal Pulse
              </span>
              <h3 className="font-display text-2xl font-extrabold tracking-tight">
                {pulseName.trim() || "Your Place"}
              </h3>
              <p className="text-xs text-zinc-600 font-medium max-w-xs mx-auto">
                {pulseTitle.trim() || "How was your experience today?"}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl inline-block ring-1 ring-zinc-200 shadow-inner">
              <img src={activeQrUrl} alt="Pulse QR Card" className="w-44 h-44 mx-auto rounded-lg" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-800">Scan with Phone Camera</p>
              <p className="text-[11px] text-zinc-500">Zero Apps · Takes 5 Seconds</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-full bg-[#1805db] text-white py-3 text-xs font-bold shadow-md hover:bg-[#1404be] transition flex items-center justify-center gap-1.5"
              >
                <Printer size={15} /> Print Standee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
