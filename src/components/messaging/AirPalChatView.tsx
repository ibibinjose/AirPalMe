import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Send,
  Sparkles,
  Bot,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendUniversalMessage,
  subscribeMessages,
} from "@/lib/chat-store";
import type { UniversalChatMessage, UniversalConversation } from "@shared/messaging";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";

export function AirPalChatView({
  conversation,
  propertyContext,
  onActionClick,
}: {
  conversation: UniversalConversation;
  propertyContext?: any;
  onActionClick?: (action: string, payload?: any) => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UniversalChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = {
    uid: user?.uid || "guest-local",
    name: user?.displayName || "Guest",
    photo: user?.photoURL || undefined,
  };

  useEffect(() => {
    return subscribeMessages(conversation.id, setMessages);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e?: FormEvent) {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;

    void triggerHaptic("light");
    setSending(true);
    setText("");

    try {
      await sendUniversalMessage(conversation.id, clean, currentUser, {
        propertyContext,
      });
    } catch (_err) {
      toast.error("Failed to send message");
      setText(clean);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleAction(action: string, payload?: any) {
    void triggerHaptic("medium");
    if (action === "copy_wifi") {
      const wifi = propertyContext?.wifi;
      const copyText = `Network: ${wifi?.network || "Guest"}\nPassword: ${wifi?.password || "Ask Desk"}`;
      void navigator.clipboard.writeText(copyText);
      toast.success("Wi-Fi details copied to clipboard!");
    } else if (onActionClick) {
      onActionClick(action, payload);
    } else {
      // Send as chat query
      setText(action.replace(/_/g, " "));
      void handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col bg-card/95 backdrop-blur-xl">
      {/* Top Conversation Header */}
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-line/80 bg-paper shrink-0">
              {conversation.type === "ai" ? (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1805db] to-[#12049e] text-white">
                  <Bot size={20} />
                </div>
              ) : conversation.photo ? (
                <Photo src={conversation.photo} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-ink text-white font-bold text-sm">
                  {conversation.title[0]}
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-sm font-bold text-ink truncate">{conversation.title}</h3>
              {conversation.type === "ai" && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                  24/7 AI
                </span>
              )}
            </div>
            <p className="text-[11px] text-mute truncate">
              {conversation.subtitle ||
                (conversation.type === "ai"
                  ? "Always online · Concierge & Assistant"
                  : conversation.type === "stay"
                    ? "Front Desk & AirPal AI Staff"
                    : "Active on AirPal")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setText("@airpal ");
              inputRef.current?.focus();
            }}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-brand/10 px-2.5 text-[11px] font-bold text-brand hover:bg-brand/15 active:scale-95 transition"
            title="Ask AirPal AI Assistant"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.senderUid === currentUser.uid;
          const isAi = msg.isAi || msg.senderUid === "airpal-ai";

          return (
            <div
              key={msg.id}
              className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                  isMe ? "flex-row-reverse" : "flex-row",
                )}
              >
                {!isMe && (
                  <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-line/60 bg-paper shrink-0 mb-1">
                    {isAi ? (
                      <div className="grid h-full w-full place-items-center bg-[#1805db] text-white">
                        <Bot size={14} />
                      </div>
                    ) : msg.senderPhoto ? (
                      <Photo src={msg.senderPhoto} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-ink text-white font-bold text-xs">
                        {msg.senderName[0]}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs break-words",
                    isMe
                      ? "bg-brand text-white rounded-br-xs"
                      : isAi
                        ? "bg-paper ring-1 ring-brand/30 text-ink rounded-bl-xs shadow-xs"
                        : "bg-paper ring-1 ring-line/80 text-ink rounded-bl-xs",
                  )}
                >
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-ink/75">{msg.senderName}</span>
                      {isAi && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.2 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>

              {/* Action Chips for AI Suggestions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-9 max-w-sm">
                  {msg.suggestedActions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAction(act.action, act.payload)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand/10 hover:bg-brand/20 text-brand px-3 py-1 text-[11px] font-semibold ring-1 ring-brand/20 transition active:scale-95"
                    >
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-mute/70 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="border-t border-line/70 bg-card p-3 sm:p-4 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${conversation.title} or type @airpal…`}
          className="flex-1 h-11 rounded-full bg-paper/80 px-4 text-xs sm:text-sm text-ink outline-none ring-1 ring-line/80 focus:ring-2 focus:ring-brand/40 placeholder:text-mute"
        />

        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
