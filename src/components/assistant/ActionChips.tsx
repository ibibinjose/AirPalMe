import type { LucideIcon } from "lucide-react";

export type ChatAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

/** Horizontal quick-action chips with real icons — never emoji. */
export function ActionChips({ actions, ariaLabel }: { actions: ChatAction[]; ariaLabel: string }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-line bg-card px-3 py-2"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.run}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-brand hover:text-white active:scale-95"
        >
          <action.icon size={14} aria-hidden />
          {action.label}
        </button>
      ))}
    </div>
  );
}
