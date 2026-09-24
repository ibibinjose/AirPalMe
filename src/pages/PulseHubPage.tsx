import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
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
  Hotel,
  PartyPopper,
  Printer,
  Scissors,
  Sparkles,
  Star,
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

const EMOJIS = ["😠", "😕", "😐", "🙂", "😍"];

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

  function handlePrintCard() {
    window.print();
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
      await resolvePulseIssue(workspaceId, issueId, note || undefined);
      toast.success("Issue marked resolved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand/10 via-card/50 to-bg pt-12 pb-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-semibold ring-1 ring-brand/30">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>AirPal Pulse · Real-Time QR Feedback Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-ink">
            Instant Customer Feedback with <span className="text-brand">Zero Apps</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto">
            Collect real-time ratings, catch unhappy customers before they leave bad reviews, and resolve issues on the spot. Designed for any business, venue, event, or individual.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => {
                const el = document.getElementById("pulse-builder");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-brand text-white hover:bg-brand-hover h-11 px-6 font-semibold shadow-md"
            >
              Create Your Free Pulse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {user && (
              <Button
                variant="outlined"
                onClick={() => {
                  const el = document.getElementById("pulse-live-hub");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-11 px-5"
              >
                <Activity className="w-4 h-4 mr-2 text-brand" />
                Live Inbox ({openIssues.length} open)
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Pulse Builder Studio */}
        <section id="pulse-builder" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Pulse Studio</h2>
              <p className="text-sm text-ink-muted">Choose your industry template, customize the prompt, and mint a live QR code.</p>
            </div>
            <span className="text-xs font-mono bg-card px-2.5 py-1 rounded-md border border-line text-ink-muted">
              Step 1 of 2 · 1-Click Deploy
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form & Configuration */}
            <div className="lg:col-span-7 space-y-6">
              {/* Template Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  1. Select Template
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
                        className={`text-left p-3.5 rounded-xl border transition-all text-sm ${
                          isSelected
                            ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-xs"
                            : "border-line bg-card hover:border-brand/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 font-bold text-ink">
                          <div className={`p-2 rounded-lg ${isSelected ? "bg-brand text-white" : "bg-bg text-brand"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{tmpl.title}</span>
                        </div>
                        <p className="text-xs text-ink-muted mt-2 line-clamp-2">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customizer */}
              <div className="p-5 rounded-2xl bg-card border border-line space-y-4 shadow-xs">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  2. Customize Your Pulse
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Business or Pulse Name
                    </label>
                    <input
                      type="text"
                      value={pulseName}
                      onChange={(e) => setPulseName(e.target.value)}
                      placeholder="e.g. Surry Hills Cafe & Bar, Table 12, Workshop Q&A"
                      className="w-full h-10 px-3.5 rounded-lg bg-bg border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Header Question / Prompt
                    </label>
                    <input
                      type="text"
                      value={pulseTitle}
                      onChange={(e) => setPulseTitle(e.target.value)}
                      placeholder="e.g. How was your coffee & service today?"
                      className="w-full h-10 px-3.5 rounded-lg bg-bg border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Placement Label
                    </label>
                    <input
                      type="text"
                      value={placementLabel}
                      onChange={(e) => setPlacementLabel(e.target.value)}
                      placeholder="e.g. Table card, Receipt footer, Entrance banner"
                      className="w-full h-10 px-3.5 rounded-lg bg-bg border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateAndPublish}
                  disabled={busy}
                  className="w-full bg-brand text-white hover:bg-brand-hover h-11 text-base font-semibold mt-2 shadow-sm"
                >
                  {busy ? "Minting QR & Link..." : "Generate Live Pulse & QR Code"}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Guest Preview Card */}
            <div className="lg:col-span-5 space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Live Guest Mobile Preview
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Real-Time Output
                </span>
              </div>

              {/* Mobile Mockup Frame */}
              <div className="p-4 rounded-3xl bg-card border-2 border-line/80 shadow-lg max-w-sm mx-auto">
                <div className="w-12 h-1 bg-line rounded-full mx-auto mb-4" />
                <div className="p-4 rounded-2xl bg-bg border border-line space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                      {pulseName.trim() || "Your Business"}
                    </span>
                    <h3 className="text-base font-extrabold text-ink">
                      {pulseTitle.trim() || "How was your experience?"}
                    </h3>
                  </div>

                  {/* Emoji Rating Row */}
                  <div className="flex items-center justify-between gap-1 p-2 bg-card rounded-xl border border-line">
                    {EMOJIS.map((emoji, idx) => {
                      const score = idx + 1;
                      const active = previewRating === score;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setPreviewRating(score)}
                          className={`text-2xl p-2 rounded-lg transition-all ${
                            active ? "bg-brand/20 scale-110 ring-1 ring-brand" : "hover:bg-bg opacity-75"
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic conditional reveal preview */}
                  {previewRating <= 2 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Smart Logic: Issue Gating Active</span>
                      </div>
                      <p className="text-ink-muted text-[11px]">
                        Guest rates $\le 2$ $\rightarrow$ System automatically asks for issue category, help note & triggers real-time host alert.
                      </p>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <span className="text-[10px] text-ink-muted">Powered by AirPal Pulse · Frictionless</span>
                  </div>
                </div>
              </div>

              {/* QR Code Action Output */}
              {activePublicToken && activeQrUrl && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={activeQrUrl} alt="Pulse QR" className="w-20 h-20 rounded-lg border border-line bg-white p-1" />
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-bold text-emerald-800">Your Pulse is Live!</div>
                      <div className="text-[11px] font-mono text-ink-muted truncate">
                        {buildPulsePublicUrl(activePublicToken, publicSiteOrigin())}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outlined" size="sm" onClick={handleCopyLink} className="h-7 text-xs px-2.5">
                          <Copy className="w-3 h-3 mr-1" /> Copy Link
                        </Button>
                        <a
                          href={buildPulsePublicUrl(activePublicToken, publicSiteOrigin())}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs font-semibold text-brand hover:underline"
                        >
                          Test View <ExternalLink className="w-3 h-3 ml-1" />
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
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="w-6 h-6 text-brand" />
                Live Feedback & Issues Hub
              </h2>
              <p className="text-sm text-ink-muted">Real-time incoming guest ratings, resolution tickets, and follow-ups.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outlined" size="sm" onClick={handleDownloadCsv} className="h-9">
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
              <Button variant="outlined" size="sm" onClick={handlePrintCard} className="h-9">
                <Printer className="w-4 h-4 mr-1.5" />
                Print Cards
              </Button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-line shadow-xs">
              <div className="text-xs text-ink-muted">Total Responses</div>
              <div className="text-2xl font-black text-ink mt-1">{responses.length}</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line shadow-xs">
              <div className="text-xs text-ink-muted">Average Score</div>
              <div className="text-2xl font-black text-brand mt-1">
                {avgScore != null ? `${avgScore.toFixed(1)} / 5.0` : "—"}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line shadow-xs">
              <div className="text-xs text-ink-muted">Open Issues</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{openIssues.length}</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line shadow-xs">
              <div className="text-xs text-ink-muted">Resolved</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{resolvedIssues.length}</div>
            </div>
          </div>

          {/* Open Issues Action Board */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Action Required · Open Tickets ({openIssues.length})
            </h3>

            {openIssues.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card border border-line text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="font-bold text-ink">All Clear! No Open Issues</div>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  When guests submit ratings $\le 2$ or request contact, tickets appear here in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openIssues.map((issue) => (
                  <div key={issue.id} className="p-5 rounded-2xl bg-card border border-line space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-600">
                        {issue.category} · Score {issue.primaryScore ?? "?"}/5
                      </span>
                      <span className="text-xs text-ink-muted">{issue.status}</span>
                    </div>

                    <div className="font-semibold text-sm text-ink">{issue.summary}</div>

                    {issue.contactRequested && (
                      <div className="text-xs bg-bg p-2.5 rounded-lg border border-line space-y-1">
                        <div className="font-medium text-brand">Guest Requested Contact:</div>
                        <div>Name: {issue.contactName || "Guest"}</div>
                        <div>Method: {issue.contactMethod || "Not provided"}</div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-line">
                      {issue.status === "open" && (
                        <Button
                          size="sm"
                          variant="outlined"
                          onClick={() => handleAcknowledge(issue.id)}
                          className="w-full text-xs h-8"
                        >
                          Acknowledge Issue
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Resolution note (e.g. comped meal, fixed AC)"
                          value={resolutionNoteByIssue[issue.id] || ""}
                          onChange={(e) =>
                            setResolutionNoteByIssue({ ...resolutionNoteByIssue, [issue.id]: e.target.value })
                          }
                          className="flex-1 h-8 px-2.5 rounded-md bg-bg border border-line text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleResolve(issue.id)}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs px-3"
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

