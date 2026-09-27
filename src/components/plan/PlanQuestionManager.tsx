import { useState } from "react";
import { ListChecks, Plus, Type, X } from "lucide-react";
import {
  PLAN_QUESTIONS_MAX,
  validGuestQuestion,
  type PlanGuestQuestion,
  type PlanQuestionType,
} from "@shared/plan";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

/** Host-only: ask diet / transport / vibe. Guests answer in the RSVP sheet. */
export function PlanQuestionManager({
  questions,
  onAdd,
  onRemove,
}: {
  questions: PlanGuestQuestion[];
  onAdd: (input: { question: string; type: PlanQuestionType; options?: string[] }) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [type, setType] = useState<PlanQuestionType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    const options = optionsText
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const errors = validGuestQuestion({ question: text, type, options });
    if (errors.length) {
      setError(errors[0]!);
      return;
    }
    void triggerHaptic("light");
    onAdd({ question: text.trim(), type, options: type === "choice" ? options : undefined });
    setText("");
    setOptionsText("");
    setError("");
  }

  return (
    <div className="py-1">
      {questions.length > 0 && (
        <ul className="space-y-2 pb-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-3.5 py-2.5 ring-1 ring-line"
            >
              <span className="flex min-w-0 items-center gap-2">
                {q.type === "choice" ? (
                  <ListChecks size={14} className="shrink-0 text-mute" />
                ) : (
                  <Type size={14} className="shrink-0 text-mute" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">{q.question}</span>
                  {q.type === "choice" && (
                    <span className="block truncate text-[11px] text-mute">{(q.options || []).join(" · ")}</span>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(q.id)}
                aria-label={`Remove question ${q.question}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-mute hover:bg-line/40 hover:text-ink transition active:scale-95"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {questions.length >= PLAN_QUESTIONS_MAX ? (
        <p className="py-2 text-[11px] text-mute">Question limit reached ({PLAN_QUESTIONS_MAX}).</p>
      ) : (
        <form onSubmit={add} className="space-y-2 border-t border-line/60 pt-2.5">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder="e.g. Any dietary needs?"
            aria-label="New question"
            className="h-11 w-full rounded-2xl bg-paper px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-paper p-1 ring-1 ring-line" role="group" aria-label="Question type">
              {(["text", "choice"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => {
                    void triggerHaptic("light");
                    setType(t);
                    setError("");
                  }}
                  className={cn(
                    "h-9 rounded-xl px-4 text-xs font-semibold capitalize transition active:scale-95",
                    type === t ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {type === "choice" && (
              <input
                type="text"
                value={optionsText}
                onChange={(e) => {
                  setOptionsText(e.target.value);
                  setError("");
                }}
                placeholder="Options, comma separated"
                aria-label="Choice options"
                className="h-11 min-w-0 flex-1 rounded-2xl bg-paper px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            )}
            <button
              type="submit"
              disabled={!text.trim()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 disabled:opacity-40"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
          {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
