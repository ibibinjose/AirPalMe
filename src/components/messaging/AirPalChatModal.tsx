import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AirPalChatView } from "./AirPalChatView";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { UniversalConversation } from "@shared/messaging";

export function AirPalChatModal({
  open,
  onClose,
  conversation,
  propertyContext,
  onActionClick,
}: {
  open: boolean;
  onClose: () => void;
  conversation: UniversalConversation | null;
  propertyContext?: { wifi?: { network?: string; password?: string } };
  onActionClick?: (action: string, payload?: string) => void;
}) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !conversation) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] max-h-[700px] w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-card ring-1 ring-line shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-paper/80 text-mute hover:text-ink hover:bg-paper active:scale-95 transition cursor-pointer"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>

        <AirPalChatView conversation={conversation} propertyContext={propertyContext} onActionClick={onActionClick} />
      </div>
    </div>,
    document.body,
  );
}
