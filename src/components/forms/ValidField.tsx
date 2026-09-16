import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function ValidField({
  label,
  hint,
  ok,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  ok?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="text-[12px] text-mute">{label}</span>}
      <div className={cn("relative", label && "mt-1")}>
        {children}
        {ok && !error && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden>
            <Check size={18} strokeWidth={2.6} />
          </span>
        )}
      </div>
      {(error || hint) && (
        <span className={cn("mt-1 block text-[12px]", error ? "text-red-600" : "text-mute")}>{error || hint}</span>
      )}
    </label>
  );
}

export const fieldInput =
  "h-12 w-full rounded-2xl bg-card px-4 pr-10 ring-1 ring-line outline-none";
