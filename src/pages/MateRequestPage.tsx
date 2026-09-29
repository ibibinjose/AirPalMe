import { useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { createSubmitGuard } from "@/lib/submit-guard";
import {
  MATE_USE_CASES,
  emptyMateRequest,
  isUseCase,
  mateRequestPlanHref,
  mateRequestValid,
} from "@shared/mate-request";

const inputCls =
  "mt-1 min-h-[48px] w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none placeholder:text-mute focus:border-brand";

export function MateRequestPage() {
  const params = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const { user, authReady, requireUser } = useAuth();
  const { today } = useLocalNow();
  const preferredMateUid = params.get("preferredMate") || "";
  const preferredMateName = params.get("name") || "";

  const initial = emptyMateRequest();
  const hinted = params.get("useCase");
  if (hinted && isUseCase(hinted)) initial.useCase = hinted;
  if (preferredMateName && !initial.mateKind) {
    initial.mateKind = `Preferred Mate: ${preferredMateName}`;
  }

  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  // Synchronous double-tap guard: `sending` only disables the button after a
  // re-render, so a second tap can file a second mate_request (same race that
  // duplicated plans on PlanCreatePage).
  const guardRef = useRef(createSubmitGuard());
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!requireUser("Sign in to request a Mate.")) return;
    if (!user || !mateRequestValid(form, today)) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — requests are filed through the live backend.");
      return;
    }
    if (!guardRef.current.tryAcquire()) return;
    setSending(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "mate_requests"), {
        ownerUid: user.uid,
        useCase: form.useCase,
        what: form.what.trim(),
        date: form.date,
        time: form.time,
        suburb: form.suburb.trim(),
        partySize: form.partySize,
        budget: form.budget,
        mateKind: form.mateKind.trim(),
        preferredMateUid: preferredMateUid || undefined,
        preferredMateName: preferredMateName || undefined,
        status: "open",
        adminNote: "",
        createdAt: now,
        updatedAt: now,
      });
      void triggerHaptic("success");
      setSent(true);
    } catch (e) {
      void triggerHaptic("error");
      guardRef.current.release();
      setError(e instanceof Error ? e.message : "Couldn't file your request. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold tracking-tight">Request received</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          We&apos;re finding your Mate now. We&apos;ll be in touch shortly — keep an eye on your inbox.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => nav("/mate")}>Back to Mate</Button>
          <Button variant="ghost" onClick={() => nav(mateRequestPlanHref(form))}>
            Make a Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 pb-28">
      <Link
        href="/mate"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
      >
        <ArrowLeft size={14} /> Mate
      </Link>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">AirPal Mate</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">What do you want to do?</h1>
      <p className="mt-1 text-sm text-mute">
        One request, one match. If you set a budget, you pay by card on AirPal after you’re matched.
      </p>

      {preferredMateName && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand/10 p-3.5 ring-1 ring-brand/20">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand motion-safe:animate-pulse" />
            <span className="text-xs font-semibold text-brand">
              Requesting with preferred Mate: <strong>{preferredMateName}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, mateKind: "" }));
              nav("/mate/request");
            }}
            className="text-[11px] font-semibold text-mute hover:text-ink cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
        <span className="text-[13px] font-semibold">I want someone to…</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MATE_USE_CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, useCase: c.id }))}
              aria-pressed={form.useCase === c.id}
              className={cn(
                "min-h-[64px] rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                form.useCase === c.id
                  ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand/30"
                  : "border-line hover:border-brand/40 hover:bg-paper",
              )}
            >
              <span className="block text-sm font-semibold">{c.label}</span>
              <span className="block text-[11px] leading-4 text-mute">{c.line}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[13px] font-semibold">What exactly? (min 4 characters)</span>
            <input
              value={form.what}
              onChange={(e) => setForm((f) => ({ ...f, what: e.target.value }))}
              className={inputCls}
              placeholder="Two tickets to the Enmore show on Friday"
              maxLength={140}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[13px] font-semibold">Date</span>
              <input
                type="date"
                min={today || undefined}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Time</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className={inputCls}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[13px] font-semibold">Where?</span>
            <input
              value={form.suburb}
              onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
              className={inputCls}
              placeholder="Newtown"
              maxLength={60}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[13px] font-semibold">How many people?</span>
              <input
                type="number"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) => setForm((f) => ({ ...f, partySize: Number(e.target.value) }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Budget</span>
              <input
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                className={inputCls}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[13px] font-semibold">What kind of Mate? (optional)</span>
            <input
              value={form.mateKind}
              onChange={(e) => setForm((f) => ({ ...f, mateKind: e.target.value }))}
              className={inputCls}
              placeholder="Someone who knows live music"
              maxLength={80}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-[13px] font-medium text-red-700 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        {/* Sticky submit — always visible while filling the long form */}
        <div className="sticky bottom-24 z-10 mt-4 rounded-2xl bg-card/95 p-2 ring-1 ring-line shadow-md backdrop-blur">
          <Button
            className="w-full"
            size="lg"
            disabled={!mateRequestValid(form, today) || sending}
            loading={sending}
            onClick={() => void submit()}
          >
            Request my Mate <ArrowRight size={16} />
          </Button>
          <p className="mt-2 text-center text-xs text-mute">Meet in public. You only pay when booking opens.</p>
        </div>
      </div>
    </div>
  );
}
