import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface AppleWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "standard" | "compact";
}

/**
 * Official style "Add to Apple Wallet" button following Apple HIG.
 */
export function AppleWalletButton({ className, variant = "standard", onClick, ...props }: AppleWalletButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        void triggerHaptic("medium");
        onClick?.(e);
      }}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white font-medium shadow-md transition-all duration-200 hover:bg-neutral-900 active:scale-[0.98] ring-1 ring-white/20 select-none cursor-pointer",
        variant === "standard" ? "px-4 py-2.5 text-xs tracking-tight" : "px-3 py-1.5 text-[11px]",
        className,
      )}
      {...props}
    >
      {/* Apple Wallet Icon */}
      <svg
        className={variant === "standard" ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="2" y="5" width="28" height="22" rx="4" fill="#1C1C1E" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <path d="M5 10H27" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M5 15H27" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M5 20H21" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="25" cy="20" r="2" fill="#FF2D55" />
      </svg>
      <span className="font-semibold text-white/95 group-hover:text-white">
        Add to <span className="font-bold">Apple Wallet</span>
      </span>
    </button>
  );
}
