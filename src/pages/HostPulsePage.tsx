import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { hostWorkspacePropertyId } from "@/lib/host-workspace";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
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

  useEffect(() => {
    if (!publicToken) {
      setQr(null);
      return;
    }
    void makeQrDataUrl(buildPulsePublicUrl(publicToken, publicSiteOrigin())).then(setQr);
  }, [publicToken]);

  const avg = useMemo(() => averagePrimaryScore(responses), [responses]);
  const openIssues = useMemo(() => issues.filter((i) => i.status !== "resolved"), [issues]);
  const resolvedIssues = useMemo(() => issues.filter((i) => i.status === "resolved").slice(0, 10), [issues]);
  const activePulse = useMemo(
    () => pulses.find((p) => p.status === "live" || p.status === "paused") || pulses[0],
    [pulses],
  );

  async function onSetStatus(pulseId: string, status: "live" | "paused" | "archived") {
    if (!workspaceId) return;
    setBusy(true);
    try {
      await setPulseStatus(workspaceId, pulseId, status);
      toast.success(status === "live" ? "Pulse is live again" : status === "paused" ? "Pulse paused" : "Pulse archived");
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

  function downloadCsv() {
    const csv = pulseResponsesToCsv(responses);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-responses-${workspaceId || "property"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
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
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
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

      <section className="mt-6 rounded-[28px] bg-card p-5 ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Stay template</p>
            <p className="text-xs text-mute">How is your stay? → if ≤2, what went wrong → help → optional contact.</p>
          </div>
          <Button loading={busy} onClick={() => void onCreateAndPublish()}>
            Create During-stay Pulse
          </Button>
        </div>
        {publicToken && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
            {qr ? <img src={qr} alt="Pulse QR" className="h-40 w-40 rounded-2xl bg-white p-2 ring-1 ring-line" /> : null}
            <div>
              <p className="text-xs font-medium text-mute">Public link</p>
              <a className="break-all text-sm font-medium text-brand" href={`/pulse/${publicToken}`}>
                {buildPulsePublicUrl(publicToken, publicSiteOrigin())}
              </a>
              <p className="mt-2 text-xs text-mute">
                Token format: <code className="rounded bg-paper px-1">pls_</code> + 20 URL-safe chars. Print this QR for
                room / lobby cards.
              </p>
              <p className="mt-1 text-xs text-mute">SMS / email alerts: pending. In-app host bell + FCM: live.</p>
            </div>
          </div>
        )}
      </section>

      {activePulse && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-card p-4 ring-1 ring-line">
          <div>
            <p className="text-sm font-semibold">
              {activePulse.name} · <span className="capitalize text-mute">{activePulse.status}</span>
            </p>
            <p className="text-xs text-mute">
              {activePulse.status === "live"
                ? "Accepting responses."
                : activePulse.status === "paused"
                  ? "Paused — the QR link is temporarily dead."
                  : activePulse.status === "archived"
                    ? "Archived — the QR link stays dead."
                    : "Draft — publish to go live."}
            </p>
          </div>
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

      <div className="mt-4 grid grid-cols-3 gap-2">
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

      <div className="mt-6 mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-mute">Open issues{openIssues.length ? ` · ${openIssues.length}` : ""}</h2>
      </div>
      <ul className="space-y-2">
        {openIssues.length === 0 ? (
          <li className="rounded-[22px] bg-card p-6 text-center text-sm text-mute ring-1 ring-line">No open Pulse issues.</li>
        ) : (
          openIssues.slice(0, 20).map((issue) => (
            <li key={issue.id} className="rounded-[22px] bg-card p-4 ring-1 ring-line">
              <p className="text-[12px] text-mute">
                {issue.category}
                {issue.roomNumber ? ` · Room ${issue.roomNumber}` : ""}
                {issue.primaryScore != null ? ` · ${issue.primaryScore}/5` : ""} · {issue.status}
              </p>
              <p className="mt-0.5 font-medium">{issue.summary}</p>
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
                    onClick={() => {
                      void acknowledgePulseIssue(workspaceId!, issue.id)
                        .then(() => {
                          void track("pulse_issue_acknowledged", {
                            contextId: workspaceId!,
                            issueId: issue.id,
                            pulseId: issue.pulseId,
                          });
                          toast.success("Acknowledged");
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
                    }}
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
                  onClick={() => {
                    void resolvePulseIssue(workspaceId!, issue.id, noteByIssue[issue.id])
                      .then(() => {
                        void track("pulse_issue_resolved", {
                          contextId: workspaceId!,
                          issueId: issue.id,
                          pulseId: issue.pulseId,
                        });
                        toast.success("Resolved");
                      })
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
                  }}
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
          <div className="mt-8 mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-mute">Resolved · record a follow-up</h2>
          </div>
          <ul className="space-y-2">
            {resolvedIssues.map((issue) => (
              <li key={issue.id} className="rounded-[22px] bg-card p-4 ring-1 ring-line">
                <p className="text-[12px] text-mute">
                  {issue.category}
                  {issue.roomNumber ? ` · Room ${issue.roomNumber}` : ""}
                  {issue.followupScore != null ? ` · follow-up ${issue.followupScore}/5` : ""}
                </p>
                <p className="mt-0.5 font-medium">{issue.summary}</p>
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

      <div className="mt-8 mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-mute">Responses{responses.length ? ` · ${responses.length}` : ""}</h2>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95 disabled:opacity-50"
          onClick={downloadCsv}
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
              <p className="text-[12px] text-mute">
                {row.primaryScore != null ? `${row.primaryScore}/5` : "—"}
                {row.roomNumber ? ` · Room ${row.roomNumber}` : ""}
                {row.issueId ? " · issue opened" : ""} · {new Date(row.createdAt).toLocaleString()}
              </p>
              <p className="truncate text-sm">
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
  );
}
