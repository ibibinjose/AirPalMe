import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { SwipeChoice } from "@/components/pulse/SwipeChoice";
import { ensureAnonymousSession } from "@/lib/firebase";
import { fetchPulseByToken, submitPulse } from "@/lib/pulse-store";
import {
  evaluateLogic,
  isPulsePublicToken,
  visibleQuestions,
  type PulseAnswer,
  type PulsePublicDto,
  type PulseQuestion,
} from "@shared/pulse";

const EMOJI = ["😠", "😕", "😐", "🙂", "😍"];

export function PulsePublicPage() {
  const params = useParams<{ publicToken: string }>();
  const publicToken = String(params.publicToken || "").trim();
  const [pulse, setPulse] = useState<PulsePublicDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PulseAnswer[]>([]);
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ issueCreated: boolean } | null>(null);
  const [showContact, setShowContact] = useState(false);
  // One idempotency key per form instance: double-taps and retried submits
  // return the original response instead of duplicating it.
  const clientKeyRef = useRef("");
  if (!clientKeyRef.current) {
    try {
      clientKeyRef.current = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    } catch {
      clientKeyRef.current = `k${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!isPulsePublicToken(publicToken)) {
      setError("This Pulse link is not valid.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        await ensureAnonymousSession();
        const dto = await fetchPulseByToken(publicToken);
        if (cancelled) return;
        setPulse(dto);
        // pulse_viewed is written authoritatively by getPulseByToken
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this Pulse.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const visible = useMemo(() => (pulse ? visibleQuestions(pulse, answers) : []), [pulse, answers]);
  const current: PulseQuestion | undefined = visible[step];
  const logic = useMemo(() => (pulse ? evaluateLogic(pulse.logic, answers) : null), [pulse, answers]);

  function setAnswer(question: PulseQuestion, value: number | string | boolean, label?: string) {
    setAnswers((prev) => {
      const next = prev.filter((a) => a.questionId !== question.id);
      next.push({ questionId: question.id, type: question.type, value, label });
      return next;
    });
  }

  async function onSubmit() {
    if (!pulse) return;
    setSubmitting(true);
    try {
      await ensureAnonymousSession();
      const result = await submitPulse({
        publicToken,
        answers,
        contactRequested: Boolean(logic?.askContact && (contactName || contactMethod)),
        contactName: contactName.trim() || undefined,
        contactMethod: contactMethod.trim() || undefined,
        roomNumber: roomNumber.trim() || undefined,
        clientKey: clientKeyRef.current || undefined,
      });
      setDone({ issueCreated: Boolean(result.createIssue) });
      toast.success(result.createIssue ? "Sent — the team has been alerted" : "Thanks for your feedback");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!pulse) return;
    if (step + 1 < visible.length) {
      setStep((s) => s + 1);
      return;
    }
    if (evaluateLogic(pulse.logic, answers).askContact) {
      setShowContact(true);
      return;
    }
    void onSubmit();
  }

  const advanceTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  function clearAdvance() {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }

  /** Tap-to-answer: select, flash the choice, then glide on. Text stays manual. */
  function chooseAndAdvance(
    question: PulseQuestion,
    value: number | string | boolean,
    label?: string,
  ) {
    setAnswer(question, value, label);
    clearAdvance();
    advanceTimer.current = window.setTimeout(() => goNextRef.current(), 380);
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 text-sm text-mute">
        Loading Pulse…
      </div>
    );
  }

  if (error || !pulse) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Pulse</p>
        <h1 className="font-display mt-2 text-2xl font-semibold">Link unavailable</h1>
        <p className="mt-2 text-sm text-mute">{error || "This Pulse is not accepting responses."}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Pulse</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{done.issueCreated ? "We've got it" : "Thank you"}</h1>
        <p className="mt-3 text-sm text-mute">
          {done.issueCreated
            ? "Your note was sent to the team so they can help during your stay."
            : `Thanks for telling ${pulse.propertyName} how things are going.`}
        </p>
        <p className="mt-8 text-xs text-mute">Powered by AirPal</p>
      </div>
    );
  }

  const totalSteps = visible.length + (logic?.askContact ? 1 : 0);
  const progress = totalSteps ? Math.min(1, (step + (showContact ? 1 : 0) + 1) / totalSteps) : 0;
  const binaryOptions =
    current?.type === "single_choice" && (current.options || []).length === 2
      ? (current.options as [string, string])
      : null;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md px-4 pb-28 pt-6">
      {pulse.propertyHeroImage ? (
        <div>
          <div className="relative h-40 overflow-hidden rounded-[28px] ring-1 ring-line">
            <img
              src={pulse.propertyHeroImage}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
                AirPal Pulse
              </p>
              <p className="font-display text-lg font-bold leading-snug text-white">
                {pulse.propertyName}
              </p>
            </div>
          </div>
          <h1 className="font-display mt-4 text-2xl font-semibold">{pulse.title}</h1>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            AirPal Pulse
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold">{pulse.title}</h1>
          <p className="mt-1 text-sm text-mute">{pulse.propertyName}</p>
        </div>
      )}

      {totalSteps > 0 && (
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-xs font-semibold text-mute">
            {showContact ? "Last step" : `Question ${Math.min(step + 1, totalSteps)} of ${totalSteps}`}
          </p>
          <p className="text-xs font-bold text-ink">{Math.round(progress * 100)}%</p>
        </div>
      )}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {showContact ? (
        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">Want someone to reach you?</h2>
          <p className="text-sm text-mute">Optional. Leave blank to stay anonymous.</p>
          <input
            className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[15px] outline-none focus:border-brand"
            placeholder="Name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[15px] outline-none focus:border-brand"
            placeholder="Phone or email"
            value={contactMethod}
            onChange={(e) => setContactMethod(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[15px] outline-none focus:border-brand"
            placeholder="Room number (optional)"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
          <p className="text-xs text-mute">SMS / email follow-ups are pending — the host is alerted in-app now.</p>
          <Button className="w-full" loading={submitting} onClick={() => void onSubmit()}>
            Send
          </Button>
        </section>
      ) : current ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">{current.prompt}</h2>
          <div className="mt-5">
            {(current.type === "rating_5" || current.type === "emoji") && (
              <div className="grid grid-cols-5 gap-2">
                {(current.options?.length ? current.options : EMOJI).slice(0, 5).map((emoji, idx) => {
                  const value = idx + 1;
                  const selected = answers.find((a) => a.questionId === current.id)?.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} of 5`}
                      onClick={() => chooseAndAdvance(current, value, emoji)}
                      className={`grid h-14 place-items-center rounded-2xl text-2xl ring-1 ${
                        selected ? "bg-ink text-white ring-ink" : "bg-card ring-line"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}
            {current.type === "yes_no" && (
              <div>
                <div className="mb-3">
                  <SwipeChoice
                    key={current.id}
                    leftLabel="No"
                    rightLabel="Yes"
                    onChoose={(side) => chooseAndAdvance(current, side === "right")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map((v) => {
                    const selected = answers.find((a) => a.questionId === current.id)?.value === v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => chooseAndAdvance(current, v)}
                      className={`h-12 rounded-full text-sm font-medium ring-1 ${
                        selected ? "bg-ink text-white ring-ink" : "bg-card ring-line"
                      }`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  );
                })}
                </div>
              </div>
            )}
            {current.type === "single_choice" && (
              <div>
                {binaryOptions && (
                  <div className="mb-3">
                    <SwipeChoice
                      key={current.id}
                      leftLabel={binaryOptions[1]}
                      rightLabel={binaryOptions[0]}
                      onChoose={(side) =>
                        chooseAndAdvance(current, binaryOptions[side === "right" ? 0 : 1])
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {(current.options || []).map((opt) => {
                    const selected = answers.find((a) => a.questionId === current.id)?.value === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => chooseAndAdvance(current, opt)}
                      className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium ring-1 ${
                        selected ? "bg-ink text-white ring-ink" : "bg-card ring-line"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
                </div>
              </div>
            )}
            {current.type === "text_short" && (
              <textarea
                className="min-h-[100px] w-full rounded-2xl border border-line bg-paper p-3 text-[15px] outline-none focus:border-brand"
                placeholder="A short note"
                maxLength={500}
                value={String(answers.find((a) => a.questionId === current.id)?.value || "")}
                onChange={(e) => setAnswer(current, e.target.value)}
              />
            )}
            {current.type === "nps" && (
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {Array.from({ length: 11 }, (_, n) => n).map((n) => {
                  const selected = answers.find((a) => a.questionId === current.id)?.value === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => chooseAndAdvance(current, n)}
                      className={`h-11 rounded-xl text-sm font-medium ring-1 ${
                        selected ? "bg-ink text-white ring-ink" : "bg-card ring-line"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  clearAdvance();
                  setStep((s) => Math.max(0, s - 1));
                }}
              >
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={current.required && !answers.some((a) => a.questionId === current.id)}
              loading={submitting}
              onClick={() => {
                clearAdvance();
                goNext();
              }}
            >
              {step + 1 < visible.length || logic?.askContact ? "Next" : "Send"}
            </Button>
          </div>
        </section>
      ) : (
        <div className="mt-8 text-center text-sm text-mute">Nothing to answer right now.</div>
      )}

      <p className="mt-10 text-center text-[11px] text-mute">Powered by AirPal · takes under a minute</p>
    </div>
  );
}
