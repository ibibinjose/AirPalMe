import type { ButtonHTMLAttributes } from "react";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface GoogleWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "standard" | "compact";
}

/**
 * "Save to Google Wallet" button. Opens the signed Google save link minted
 * by /api/wallet/google/* — same passes as Apple Wallet, Google flavored.
 */
export function GoogleWalletButton({ className, variant = "standard", onClick, ...props }: GoogleWalletButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        void triggerHaptic("medium");
        onClick?.(e);
      }}
      className={cn(
        "group relative inline-flex select-none items-center justify-center gap-2 rounded-xl bg-white font-medium text-ink shadow-md ring-1 ring-line transition-all duration-200 hover:bg-paper active:scale-[0.98] cursor-pointer",
        variant === "standard" ? "px-4 py-2.5 text-xs tracking-tight" : "px-3 py-1.5 text-[11px]",
        className,
      )}
      {...props}
    >
      <Wallet size={variant === "standard" ? 18 : 15} className="shrink-0 text-brand" aria-hidden="true" />
      <span className="font-semibold text-ink/90 group-hover:text-ink">
        Save to <span className="font-bold">Google Wallet</span>
      </span>
    </button>
  );
}
