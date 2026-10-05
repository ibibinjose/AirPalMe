import { useEffect, useRef, useState } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Select language"
        aria-expanded={open}
        className="flex h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-white/15 text-xs text-white/90 transition hover:bg-white/25 hover:text-white cursor-pointer"
      >
        <Globe size={16} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-40 overscroll-contain rounded-2xl border border-line bg-card p-1.5 text-ink shadow-xl ring-1 ring-line animate-in fade-in zoom-in-95">
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
