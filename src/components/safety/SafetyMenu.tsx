import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { Flag, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  blockDocId,
  emptyReport,
  reportValid,
  type ReportReason,
} from "@shared/safety";

/** Per-person safety actions: report user/booking, or block immediately. */
export function SafetyMenu({
  targetUid,
  targetName,
  planId,
}: {
  targetUid: string;
  targetName: string;
  planId: string;
}) {
  const { user, requireUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "blocked">("menu");
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [target, setTarget] = useState<"user" | "booking">("user");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function fileReport() {
    setError(null);
    if (!requireUser("Sign in to file a safety report.")) return;
    if (!user) return;
    const input = { ...emptyReport(planId, targetUid), target, reason, details: details.trim() };
    if (!reportValid(input)) {
      setError("Tell us what happened in at least 10 characters so the team can act.");
      return;
    }
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — reports go through the live backend.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "safety_reports"), {
        reporterUid: user.uid,
        target: input.target,
        targetUid,
        planId,
        reason,
        details: input.details,
        status: "new",
        adminNote: "",
        createdAt: now,
        updatedAt: now,
      });
      setReported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function blockNow() {
    setError(null);
    if (!requireUser("Sign in to block this person.")) return;
    if (!user) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — blocks apply on the live backend.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, "blocks", blockDocId(user.uid, targetUid)), {
        blockerUid: user.uid,
        blockedUid: targetUid,
        planId,
        createdAt: now,
        updatedAt: now,
      });
      setMode("blocked");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't block. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "blocked") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-paper px-2 py-1 text-[10px] font-semibold text-mute ring-1 ring-line">
        <ShieldX size={11} /> Blocked
      </span>
    );
  }

  return (
    <span ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setMode("menu");
          setError(null);
        }}
        aria-label={`Safety options for ${targetName}`}
        aria-expanded={open}
        className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-mute hover:bg-paper cursor-pointer"
      >
        ···
      </button>
      {open && (
        <span className="absolute right-0 top-10 z-30 w-64 overscroll-contain rounded-2xl border border-line bg-card p-3 shadow-lg">
          {mode === "menu" && (
            <span className="block">
              <button
                type="button"
                onClick={() => setMode("report")}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] font-medium hover:bg-paper"
              >
                <Flag size={14} className="text-gold" /> Report {targetName}
              </button>
              <button
                type="button"
                onClick={() => void blockNow()}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] font-medium hover:bg-paper"
              >
                <ShieldX size={14} /> Block immediately
              </button>
              {error && <span className="mt-1 block text-xs text-mute">{error}</span>}
            </span>
          )}
          {mode === "report" && (
            <span className="block">
              {reported ? (
                <span className="block p-1 text-[13px] leading-6">
                  <span className="font-semibold">Report filed.</span>{" "}
                  <span className="text-mute">
                    Every report opens a case a person reviews. In danger now? Call local emergency services first.
                  </span>
                </span>
              ) : (
                <span className="block">
                  <span className="mb-1.5 flex gap-1.5">
                    {(["user", "booking"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTarget(t)}
                        aria-pressed={target === t}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1 text-xs font-semibold ring-1",
                          target === t ? "bg-brand text-white ring-ink" : "text-mute ring-line",
                        )}
                      >
                        {t === "user" ? "Person" : "Booking"}
                      </button>
                    ))}
                  </span>
                  <label className="block text-xs font-semibold">
                    What happened?
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ReportReason)}
                      className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-[16px] sm:text-[13px] font-normal outline-none focus:border-brand"
                    >
                      {REPORT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {REPORT_REASON_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="What happened, in your words (min 10 characters)…"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-2 py-2 text-[16px] sm:text-[13px] outline-none placeholder:text-mute focus:border-brand"
                  />
                  {error && <span className="mt-1 block text-xs text-mute">{error}</span>}
                  <span className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setMode("menu")}>
                      Back
                    </Button>
                    <Button size="sm" disabled={busy} loading={busy} onClick={() => void fileReport()}>
                      File report
                    </Button>
                  </span>
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
