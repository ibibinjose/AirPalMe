import { LANGS } from "@/lib/i18n";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export function LanguageSwitch({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const { lang, setLang } = useLocale();
  const isSm = size === "sm";

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={cn(
        "flex shrink-0 items-center rounded-full bg-white p-0.5 ring-1 ring-line",
        isSm ? "h-7 sm:h-8" : "h-8 sm:h-9",
        className,
      )}
    >
      {LANGS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={lang === item.id}
          onClick={(e) => {
            e.stopPropagation();
            void triggerHaptic("light");
            setLang(item.id);
          }}
          className={cn(
            "rounded-full font-semibold transition touch-manipulation cursor-pointer",
            isSm ? "h-6 sm:h-7 px-2 text-[10px]" : "h-7 sm:h-8 px-2.5 text-[11px]",
            lang === item.id ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
