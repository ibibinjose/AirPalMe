import { useState } from "react";
import { CheckCircle2, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ar", label: "العربية" },
];

/** Language picker. Languages are named in their own script — never flagged. */
export function LanguageMenu({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Select language"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs text-white/90 transition hover:bg-white/25 hover:text-white"
      >
        <Globe size={15} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-36 rounded-2xl border border-line bg-card p-1.5 text-ink shadow-xl ring-1 ring-line">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mute">Language</p>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
                toast.success(`Language set to ${lang.label}`);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition",
                value === lang.code ? "bg-brand text-white" : "hover:bg-paper",
              )}
            >
              <span>{lang.label}</span>
              {value === lang.code && <CheckCircle2 size={12} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
