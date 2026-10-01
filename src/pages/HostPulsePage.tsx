import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { formatWhen } from "@/lib/arrival";
import { hostWorkspacePropertyId } from "@/lib/host-workspace";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
import { isNativeApp, shareNative, triggerHaptic } from "@/lib/native";
import { anchorDownloadTextFile, shareOrDownloadTextFile } from "@/lib/share-file";
import {
  acknowledgePulseIssue,
  averagePrimaryScore,
  createDuringStayPulse,
  openPulseIssueCount,
  publishPulse,
  recordPulseFollowup,
  resolvePulseIssue,
  setPulseStatus,
  subscribePropertyPulseIssues,
  subscribePropertyPulseResponses,
  subscribePropertyPulses,
  type PropertyPulse,
} from "@/lib/pulse-store";
import { buildPulsePublicUrl, pulseResponsesToCsv, type PulseIssue, type PulseResponse } from "@shared/pulse";
import { liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

const PULSE_STATUS_STYLES: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  draft: "bg-paper text-mute ring-1 ring-line",
  archived: "bg-paper text-mute ring-1 ring-line",
};

const ISSUE_STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-600",
  acknowledged: "bg-brand/10 text-brand",
  resolved: "bg-emerald-500/10 text-emerald-600",
};

function StatusPill({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize",
        styles[status] || "bg-paper text-mute ring-1 ring-line",
      )}
    >
      {status}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black",
        score <= 2
          ? "bg-red-500/10 text-red-600"
          : score === 3
            ? "bg-amber-500/10 text-amber-600"
            : "bg-emerald-500/10 text-emerald-600",
      )}
    >
      {score}/5
    </span>
  );
}

export function HostPulsePage() {
  const { user, isHost, isAdmin, authReady } = useAuth();
  const [, nav] = useLocation();
  const workspaceId = hostWorkspacePropertyId(user?.propertyIds, isAdmin);
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [issues, setIssues] = useState<PulseIssue[]>([]);
  const [pulses, setPulses] = useState<PropertyPulse[]>([]);
  const [busy, setBusy] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [noteByIssue, setNoteByIssue] = useState<Record<string, string>>({});
  const [followupScoreByIssue, setFollowupScoreByIssue] = useState<Record<string, string>>({});
  const [followupNoteByIssue, setFollowupNoteByIssue] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!workspaceId) return;
    const a = subscribePropertyPulseResponses(workspaceId, setResponses);
    const b = subscribePropertyPulseIssues(workspaceId, setIssues);
    const c = subscribePropertyPulses(workspaceId, setPulses);
    return () => {
      a();
      b();
      c();
    };
  }, [workspaceId]);

  const avg = useMemo(() => averagePrimaryScore(responses), [responses]);
  const openIssues = useMemo(() => issues.filter((i) => i.status !== "resolved"), [issues]);
  const resolvedIssues = useMemo(() => issues.filter((i) => i.status === "resolved").slice(0, 10), [issues]);
  const activePulse = useMemo(
    () => pulses.find((p) => p.status === "live" || p.status === "paused") || pulses[0],
    [pulses],
  );

  // Freshly published token wins; otherwise reuse the persisted token so the
  // QR and link survive reloads. Archived pulses stay QR-less (link is dead).
  const qrToken =
    publicToken ||
    (activePulse && (activePulse.status === "live" || activePulse.status === "paused")
      ? activePulse.activePublicToken
      : undefined) ||
    null;
  const qrUrl = qrToken ? buildPulsePublicUrl(qrToken, publicSiteOrigin()) : null;

  useEffect(() => {
    if (!qrUrl) {
      setQr(null);
      return;
    }
    let alive = true;
    void makeQrDataUrl(qrUrl).then((dataUrl) => {
      if (alive) setQr(dataUrl);
    });
    return () => {
      alive = false;
    };
  }, [qrUrl]);

  async function onSetStatus(pulseId: string, status: "live" | "paused" | "archived") {
    if (!workspaceId) return;
    setBusy(true);
    try {
      await setPulseStatus(workspaceId, pulseId, status);
      toast.success(
        status === "live" ? "Pulse is live again" : status === "paused" ? "Pulse paused" : "Pulse archived",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status");
    } finally {
      setBusy(false);
    }
  }

  function onRecordFollowup(issueId: string) {
    if (!workspaceId) return;
    const score = Number(followupScoreByIssue[issueId]);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      toast.error("Pick a follow-up score from 1 to 5");
      return;
    }
    void triggerHaptic("light");
    void recordPulseFollowup(workspaceId, issueId, score, followupNoteByIssue[issueId]?.trim() || undefined)
      .then(() => {
        void track("pulse_followup_completed", { contextId: workspaceId, issueId });
        toast.success("Follow-up recorded");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
  }

  async function onCreateAndPublish() {
    if (!workspaceId || workspaceId === "unknown") {
      toast.error("Choose a property first");
      return;
    }
    if (!liveBackendEnabled()) {
      toast.error("Pulse needs a live connection — not available offline");
      return;
    }
    setBusy(true);
    try {
      const created = await createDuringStayPulse(workspaceId, "During stay");
      const published = await publishPulse(workspaceId, created.pulseId);
      setPublicToken(published.publicToken);
      void track("content_publish", {
        tenantId: user?.uid || workspaceId,
        contentType: "pulse",
        contentId: created.pulseId,
        contextId: workspaceId,
        actorRole: "host_admin",
      });
      toast.success("During-stay Pulse is live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create Pulse");
    } finally {
      setBusy(false);
    }
  }

  async function onCopyLink() {
    if (!qrUrl) return;
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast.success("Pulse link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  }

  function onDownloadQr() {
    if (!qr) return;
    void triggerHaptic("light");
    try {
      const a = document.createElement("a");
      a.href = qr;
      a.download = `pulse-qr-${workspaceId || "property"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR code downloaded");
    } catch {
      toast.error("Could not download QR");
    }
  }

  async function onExportCsv() {
    if (!responses.length) return;
    void triggerHaptic("light");
    const filename = `pulse-responses-${workspaceId || "property"}.csv`;
    const text = pulseResponsesToCsv(responses);
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      (() => {
        try {
          return navigator.canShare({ files: [new File(["x"], "x.csv", { type: "text/csv" })] });
        } catch {
          return false;
        }
      })();
    const outcome = await shareOrDownloadTextFile(filename, "text/csv", text, {
      isNative: isNativeApp(),
      canShareFiles,
      shareText: (title, body) => shareNative({ title, text: body, dialogTitle: "Export responses" }),
      shareFile: async (file) => {
        try {
          await navigator.share({ files: [file], title: file.name });
          return true;
        } catch {
          return false;
        }
      },
      anchorDownload: anchorDownloadTextFile,
    });
    if (outcome === "shared") toast.success("Responses shared");
    else if (outcome === "downloaded") toast.success("Responses exported");
    else toast.error("Export failed — try again");
  }

  function onAcknowledge(issue: PulseIssue) {
    if (!workspaceId) return;
    void triggerHaptic("light");
    void acknowledgePulseIssue(workspaceId, issue.id)
      .then(() => {
        void track("pulse_issue_acknowledged", {
          contextId: workspaceId,
          issueId: issue.id,
          pulseId: issue.pulseId,
        });
        toast.success("Acknowledged");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
  }

  function onResolve(issue: PulseIssue) {
    if (!workspaceId) return;
    void triggerHaptic("medium");
    void resolvePulseIssue(workspaceId, issue.id, noteByIssue[issue.id])
      .then(() => {
        void track("pulse_issue_resolved", {
          contextId: workspaceId,
          issueId: issue.id,
          pulseId: issue.pulseId,
        });
        toast.success("Resolved");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
  }

  if (!authReady) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <Loader2 size={28} className="animate-spin text-brand" />
        <p className="text-sm font-medium text-mute">Loading Pulse…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        next="/host/pulse"
        kicker="Pulse"
        title="Host Pulse"
        lede="Sign in to create a during-stay Pulse and resolve issues in the moment."
      />
    );
  }

  if (!isHost && !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Host access needed</h1>
        <p className="mt-2 text-sm text-mute">Pulse is available on a host property workspace.</p>
        <Button className="mt-6" onClick={() => nav("/host")}>
          Go to Host
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Pulse</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">During stay</h1>
          <p className="mt-1 text-sm text-mute">Capture → alert → resolve. Real responses only — no fake totals.</p>
        </div>
        <Button variant="ghost" onClick={() => nav("/host")}>
          <ArrowLeft size={15} /> Host
        </Button>
      </div>

      <div className="mt-6 items-start lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-[28px] bg-card p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Stay template</p>
                <p className="text-xs text-mute">
                  How is your stay? → if ≤2, what went wrong → help → optional contact.
                </p>
              </div>
              <Button loading={busy} onClick={() => void onCreateAndPublish()}>
                Create During-stay Pulse
              </Button>
            </div>
            {qrUrl && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
                {qr ? (
                  <img
                    src={qr}
                    alt="Pulse QR code"
                    className="mx-auto h-40 w-40 rounded-2xl bg-white p-2 ring-1 ring-line sm:mx-0"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-mute">Public link</p>
                  <p className="break-all text-sm font-medium text-brand">{qrUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onCopyLink()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        if (qrToken) nav(`/pulse/${qrToken}`);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                    {!isNativeApp() && (
                      <button
                        type="button"
                        onClick={onDownloadQr}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
                      >
                        <Download size={14} />
                        QR code
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-mute">Print this QR for room / lobby cards.</p>
                  <p className="mt-1 text-xs text-mute">
                    Host alerts: in-app bell + push live · SMS/email coming soon.
                  </p>
                </div>
              </div>
            )}
          </section>

          {activePulse && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-card p-4 ring-1 ring-line">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{activePulse.name}</p>
                <StatusPill status={activePulse.status} styles={PULSE_STATUS_STYLES} />
              </div>
              <p className="w-full text-xs text-mute">
                {activePulse.status === "live"
                  ? "Accepting responses."
                  : activePulse.status === "paused"
                    ? "Paused — the QR link is temporarily dead."
                    : activePulse.status === "archived"
                      ? "Archived — the QR link stays dead."
                      : "Draft — publish to go live."}
              </p>
              <div className="flex flex-wrap gap-2">
                {activePulse.status === "live" && (
                  <Button variant="ghost" loading={busy} onClick={() => void onSetStatus(activePulse.id, "paused")}>
                    Pause
                  </Button>
                )}
                {activePulse.status === "paused" && (
                  <Button variant="ghost" loading={busy} onClick={() => void onSetStatus(activePulse.id, "live")}>
                    Resume
                  </Button>
                )}
                {(activePulse.status === "live" || activePulse.status === "paused") && (
                  <Button variant="ghost" loading={busy} onClick={() => void onSetStatus(activePulse.id, "archived")}>
                    Archive
                  </Button>
                )}
              </div>
            </section>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { n: responses.length, l: "Responses" },
              { n: avg == null ? "—" : avg, l: "Avg rating" },
              { n: openPulseIssueCount(issues), l: "Open issues" },
            ].map((s) => (
              <div key={s.l} className="rounded-[22px] bg-card/90 p-3 text-center ring-1 ring-line">
                <p className="font-display text-2xl font-semibold">{s.n}</p>
                <p className="text-[11px] text-mute">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 lg:col-span-7 lg:mt-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-mute">
              Open issues{openIssues.length ? ` · ${openIssues.length}` : ""}
            </h2>
          </div>
          <ul className="space-y-2">
            {openIssues.length === 0 ? (
              <li className="rounded-[22px] bg-card p-6 text-center text-sm text-mute ring-1 ring-line">
                No open Pulse issues.
              </li>
            ) : (
              openIssues.slice(0, 20).map((issue) => (
                <li key={issue.id} className="rounded-[22px] bg-card p-4 ring-1 ring-line">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-mute">
                    <span>{issue.category}</span>
                    {issue.roomNumber ? <span>· Room {issue.roomNumber}</span> : null}
                    {issue.primaryScore != null ? <ScorePill score={issue.primaryScore} /> : null}
                    <StatusPill status={issue.status} styles={ISSUE_STATUS_STYLES} />
                  </div>
                  <p className="mt-1 font-medium">{issue.summary}</p>
                  {issue.contactRequested && (
                    <p className="mt-1 text-xs text-mute">
                      Contact: {[issue.contactName, issue.contactMethod].filter(Boolean).join(" · ") || "requested"}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {issue.status === "open" && (
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
                        onClick={() => onAcknowledge(issue)}
                      >
                        Acknowledge
                      </button>
                    )}
                    <input
                      className="h-11 min-w-[160px] flex-1 rounded-full border border-line bg-paper px-4 text-sm outline-none focus:border-brand"
                      placeholder="Resolution note"
                      value={noteByIssue[issue.id] || ""}
                      onChange={(e) => setNoteByIssue((m) => ({ ...m, [issue.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-ink active:scale-95"
                      onClick={() => onResolve(issue)}
                    >
                      Resolve
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {resolvedIssues.length > 0 && (
            <>
              <div className="mb-2 mt-8 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-mute">Resolved · record a follow-up</h2>
              </div>
              <ul className="space-y-2">
                {resolvedIssues.map((issue) => (
                  <li key={issue.id} className="rounded-[22px] bg-card p-4 ring-1 ring-line">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-mute">
                      <span>{issue.category}</span>
                      {issue.roomNumber ? <span>· Room {issue.roomNumber}</span> : null}
                      {issue.followupScore != null ? (
                        <span className="inline-flex items-center gap-1">
                          · follow-up <ScorePill score={issue.followupScore} />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-medium">{issue.summary}</p>
                    {issue.followupScore != null ? (
                      <p className="mt-1 text-xs text-mute">
                        Follow-up {issue.followupScore}/5{issue.followupNote ? ` — ${issue.followupNote}` : ""}
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          aria-label="Follow-up score"
                          className="h-11 rounded-full border border-line bg-paper px-4 text-sm outline-none focus:border-brand"
                          value={followupScoreByIssue[issue.id] || ""}
                          onChange={(e) => setFollowupScoreByIssue((m) => ({ ...m, [issue.id]: e.target.value }))}
                        >
                          <option value="">Score…</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}/5
                            </option>
                          ))}
                        </select>
                        <input
                          className="h-11 min-w-[160px] flex-1 rounded-full border border-line bg-paper px-4 text-sm outline-none focus:border-brand"
                          placeholder="Follow-up note (optional)"
                          value={followupNoteByIssue[issue.id] || ""}
                          onChange={(e) => setFollowupNoteByIssue((m) => ({ ...m, [issue.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-ink active:scale-95"
                          onClick={() => onRecordFollowup(issue.id)}
                        >
                          Record follow-up
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mb-2 mt-8 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-mute">
              Responses{responses.length ? ` · ${responses.length}` : ""}
            </h2>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95 disabled:opacity-50"
              onClick={() => void onExportCsv()}
              disabled={!responses.length}
            >
              Export CSV
            </button>
          </div>
          <ul className="space-y-2">
            {responses.length === 0 ? (
              <li className="rounded-[22px] bg-card p-6 text-center text-sm text-mute ring-1 ring-line">
                No responses yet. Publish a Pulse and scan the QR.
              </li>
            ) : (
              responses.slice(0, 30).map((row) => (
                <li key={row.id} className="rounded-[22px] bg-card px-4 py-3 ring-1 ring-line">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-mute">
                    {row.primaryScore != null ? <ScorePill score={row.primaryScore} /> : <span>—</span>}
                    {row.roomNumber ? <span>· Room {row.roomNumber}</span> : null}
                    {row.issueId ? <span>· issue opened</span> : null}
                    <span>· {formatWhen(new Date(row.createdAt))}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm">
                    {row.answers
                      .map((a) => String(a.value))
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
