import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, Bot, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatSendError,
  markConversationRead,
  requestAiReply,
  retryMessage,
  sendUniversalMessage,
  subscribeMessages,
} from "@/lib/chat-store";
import type { UniversalChatMessage, UniversalConversation } from "@shared/messaging";
import { MESSAGE_MAX } from "@shared/messaging";
import { smartChatTime } from "@shared/time-ago";
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
  propertyContext?: { wifi?: { network?: string; password?: string } };
  onActionClick?: (action: string, payload?: string) => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UniversalChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = {
    uid: user?.uid || "guest-local",
    name: user?.displayName || "Guest",
    photo: user?.photoURL || undefined,
  };
  const title = conversation.title || "AirPal Chat";

  useEffect(() => {
    setMessages([]);
    setText("");
    return subscribeMessages(conversation.id, setMessages);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking]);

  useEffect(() => {
    if (messages.length > 0) markConversationRead(conversation.id, currentUser.uid);
  }, [conversation.id, messages.length, user?.uid]);

  async function handleSend(e?: FormEvent, override?: string) {
    if (e) e.preventDefault();
    const clean = (override ?? text).trim();
    if (!clean || sending) return;

    void triggerHaptic("light");
    setSending(true);
    if (override === undefined) setText("");

    try {
      await sendUniversalMessage(conversation.id, clean, currentUser, {
        sync: Boolean(user),
      });
      if (conversation.type === "ai" || conversation.type === "stay" || clean.toLowerCase().includes("@airpal")) {
        setThinking(true);
        try {
          await requestAiReply(conversation, clean);
        } finally {
          setThinking(false);
        }
      }
    } catch (err) {
      toast.error(err instanceof ChatSendError ? err.message : "Couldn't send. Try again.");
      if (override === undefined) setText(clean);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleRetry(msg: UniversalChatMessage) {
    if (retryingId) return;
    setRetryingId(msg.id);
    try {
      await retryMessage(conversation.id, msg.id);
    } catch (err) {
      toast.error(err instanceof ChatSendError ? err.message : "Couldn't send. Try again.");
    } finally {
      setRetryingId(null);
    }
  }

  function handleAction(action: string, payload?: string) {
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
      void handleSend(undefined, action.replace(/_/g, " "));
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
                <div className="grid h-full w-full place-items-center bg-brand text-white">
                  <Bot size={20} />
                </div>
              ) : conversation.photo ? (
                <Photo src={conversation.photo} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-neutral-900 text-white font-bold text-sm">
                  {title[0]?.toUpperCase() || "•"}
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-sm font-bold text-ink truncate">{title}</h3>
              {conversation.type === "ai" && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  24/7 AI
                </span>
              )}
            </div>
            <p className="text-[11px] text-mute truncate">
              {conversation.subtitle ||
                (conversation.type === "ai"
                  ? "Always online · Guide & Assistant"
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
            className="inline-flex h-8 items-center gap-1 rounded-full bg-brand/10 px-2.5 text-[11px] font-bold text-accent hover:bg-brand/15 active:scale-95 transition"
            title="Ask AirPal AI Assistant"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
        {messages.length === 0 && !thinking ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-paper ring-1 ring-line text-accent">
              <Bot size={24} />
            </div>
            <p className="mt-3 font-display text-sm font-bold text-ink">Start the conversation</p>
            <p className="mt-1 text-xs text-mute max-w-xs">
              Say hello or ask questions about plans, places, and recommendations.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === currentUser.uid;
            const isAi = msg.isAi || msg.senderUid === "airpal-ai";
            const failed = msg.sync === "failed";
            const senderName = msg.senderName || (isAi ? "AirPal AI" : "AirPal");
            const stamp = smartChatTime(msg.createdAt || "");

            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                    isMe ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {!isMe && (
                    <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-line/60 bg-paper shrink-0 mb-1">
                      {isAi ? (
                        <div className="grid h-full w-full place-items-center bg-brand text-white">
                          <Bot size={14} />
                        </div>
                      ) : msg.senderPhoto ? (
                        <Photo src={msg.senderPhoto} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-neutral-900 text-white font-bold text-xs">
                          {senderName[0]?.toUpperCase() || "•"}
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
                      failed && "opacity-70",
                    )}
                  >
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-ink/75">{senderName}</span>
                        {isAi && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-accent bg-brand/10 px-1.5 py-0.2 rounded-full">
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
                        className="inline-flex items-center gap-1 rounded-full bg-brand/10 hover:bg-brand/20 text-accent px-3 py-1 text-[11px] font-semibold ring-1 ring-brand/20 transition active:scale-95"
                      >
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-mute/70 mt-1 px-1 flex items-center gap-1.5">
                  {stamp}
                  {failed && (
                    <button
                      type="button"
                      disabled={retryingId === msg.id}
                      onClick={() => void handleRetry(msg)}
                      className="inline-flex items-center gap-1 font-bold text-red-500 disabled:opacity-50"
                    >
                      <RotateCcw size={10} />
                      {retryingId === msg.id ? "Retrying…" : "Not sent · Retry"}
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
        {thinking && (
          <div className="flex items-center gap-2 pl-1">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white">
              <Bot size={14} />
            </div>
            <span
              className="flex gap-1 rounded-2xl rounded-bl-xs bg-paper px-3.5 py-2.5 ring-1 ring-brand/30"
              aria-label="AirPal AI is thinking"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="border-t border-line/70 bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${title} or type @airpal…`}
            maxLength={MESSAGE_MAX}
            aria-label="Message"
            className="flex-1 h-11 rounded-full bg-paper/80 px-4 text-[16px] sm:text-sm text-ink outline-none ring-1 ring-line/80 focus:ring-2 focus:ring-brand/40 placeholder:text-mute"
          />

          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        {text.length > MESSAGE_MAX - 200 && (
          <p className="mt-1 text-right text-[10px] text-mute">
            {text.length}/{MESSAGE_MAX}
          </p>
        )}
      </form>
    </div>
  );
}
