import { cn } from "@/lib/cn";

export function BoardFilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: string; count: number }>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-2 border-b border-line pb-3" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition",
            value === opt.id ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-paper",
          )}
        >
          {opt.label} ({opt.count})
        </button>
      ))}
    </div>
  );
}
