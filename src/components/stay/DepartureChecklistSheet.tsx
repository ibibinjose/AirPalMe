import { useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { useStayChecklist } from "@/hooks/useStayChecklist";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";

export function DepartureChecklistSheet() {
  const { property, roomLabel } = useStay();
  const { checklistOpen, closeStayUi } = useStayUi();
  const { t } = useLocale();
  const { items, toggle, add, remove, reset, done, total } = useStayChecklist();
  const [draft, setDraft] = useState("");

  return (
    <Sheet open={checklistOpen} onClose={closeStayUi} title={t("leaving")}>
      <p className="mb-1 text-[12px] text-mute">
        {property.name}
        {roomLabel ? ` · Room ${roomLabel}` : ""}
      </p>
      <p className="mb-4 font-display text-lg">
        {done} / {total}
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 ring-1 ring-line">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={item.done}
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1",
                item.done ? "bg-brand text-white ring-ink" : "bg-card ring-line",
              )}
            >
              {item.done ? <Check size={14} /> : null}
            </button>
            <button type="button" onClick={() => toggle(item.id)} className="min-w-0 flex-1 text-left">
              <p className={cn("text-[15px] leading-snug", item.done && "text-mute line-through")}>{item.label}</p>
              {item.hint && !item.done && <p className="text-[11px] text-mute">{item.hint}</p>}
            </button>
            {item.custom && (
              <button type="button" aria-label="Remove" onClick={() => remove(item.id)} className="text-mute">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("addYours")}
          className="h-11 flex-1 rounded-full bg-paper px-4 text-[15px] outline-none border border-line focus:border-brand"
        />
        <Button type="submit" size="sm" className="h-11 w-11 shrink-0 px-0" aria-label="Add">
          <Plus size={16} />
        </Button>
      </form>

      <button
        type="button"
        onClick={reset}
        className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-mute"
      >
        <RotateCcw size={14} /> {t("reset")}
      </button>
    </Sheet>
  );
}
