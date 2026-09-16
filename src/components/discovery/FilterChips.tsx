import { DISCOVER_CHIPS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";

export function FilterChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
      {DISCOVER_CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChange(chip.id)}
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-sm font-medium",
            value === chip.id ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line",
          )}
        >
          {t(`chip.${chip.id}`)}
        </button>
      ))}
    </div>
  );
}
