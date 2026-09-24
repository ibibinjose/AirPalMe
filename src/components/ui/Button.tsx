import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "dark" | "gold" | "light" | "onDark" | "tonal" | "elevated" | "outlined";
  size?: "md" | "lg" | "sm";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", className, loading, disabled, children, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex touch-manipulation select-none items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" &&
          "bg-brand text-white shadow-[0_10px_24px_-10px_rgba(24,5,219,0.75)]",
        variant === "ghost" && "bg-card text-ink ring-1 ring-line hover:bg-white",
        variant === "dark" && "bg-brand text-white",
        variant === "gold" && "bg-gold text-white",
        variant === "light" && "bg-white text-ink hover:bg-white/90",
        variant === "onDark" && "bg-ink/80 text-white ring-1 ring-white/55 hover:bg-ink",
        variant === "tonal" && "bg-brand/10 text-brand font-semibold hover:bg-brand/15 active:bg-brand/20",
        variant === "elevated" && "bg-card text-ink shadow-[var(--shadow-m3-1)] ring-1 ring-line hover:shadow-[var(--shadow-m3-2)]",
        variant === "outlined" && "bg-transparent text-ink border border-line hover:bg-black/[0.04]",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
