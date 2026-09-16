import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import {
  MATE_USE_CASES,
  emptyMateRequest,
  isUseCase,
  mateRequestValid,
} from "@shared/mate-request";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none placeholder:text-mute focus:border-brand";

function sydneyToday(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function MateRequestPage() {
  const params = new URLSearchParams(useSearch());
  const [, nav] = useLocation();
  const { user, authReady, requireUser } = useAuth();
  const initial = emptyMateRequest();
  const hinted = params.get("useCase");
  if (hinted && isUseCase(hinted)) initial.useCase = hinted;

  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!requireUser("Sign in to request a Mate.")) return;
    if (!user || !mateRequestValid(form)) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — requests are filed through the live backend.");
      return;
    }
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
        status: "open",
        adminNote: "",
        createdAt: now,
        updatedAt: now,
      });
      setSent(true);
    } catch (e) {
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
          <Button variant="ghost" onClick={() => nav("/")}>
            Browse Sydney meanwhile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href="/mate" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Mate
      </Link>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">What do you want to do?</h1>
      <p className="mt-1 text-sm text-mute">One request, one match. No payments yet — this is the free beta.</p>

      <div className="mt-5 rounded-2xl border border-line bg-card p-5">
        <span className="text-[13px] font-semibold">I want someone to…</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MATE_USE_CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => setForm((f) => ({ ...f, useCase: c.id }))}
              aria-pressed={form.useCase === c.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left",
                form.useCase === c.id ? "border-brand bg-brand/5" : "border-line hover:border-mute",
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
              <span className="text-[13px] font-semibold">Date (Sydney)</span>
              <input
                type="date"
                min={sydneyToday() || undefined}
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
            <span className="text-[13px] font-semibold">Where in Sydney?</span>
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
              <span className="text-[13px] font-semibold">Budget (AUD)</span>
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

        {error && <p className="mt-3 rounded-xl bg-paper p-3 text-[13px] text-mute ring-1 ring-line">{error}</p>}

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!mateRequestValid(form) || sending}
          loading={sending}
          onClick={() => void submit()}
        >
          Request my Mate <ArrowRight size={16} />
        </Button>
        <p className="mt-2 text-center text-xs text-mute">Meet in public. You only pay when booking opens.</p>
      </div>
    </div>
  );
}
