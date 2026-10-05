import { DISCOVER_CHIPS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHapticSelection } from "@/lib/native";

export function FilterChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useLocale();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
      {DISCOVER_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => {
            void triggerHapticSelection();
            onChange(chip.id);
          }}
          aria-pressed={value === chip.id}
          className={cn(
            "min-h-[44px] shrink-0 inline-flex items-center rounded-full px-4 text-sm font-medium touch-manipulation cursor-pointer active:scale-95 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            value === chip.id ? "bg-brand text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper",
          )}
        >
          {t(`chip.${chip.id}`)}
        </button>
      ))}
    </div>
  );
}
