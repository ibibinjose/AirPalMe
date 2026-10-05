import { useState, useRef, useEffect } from "react";
import {
  BedDouble,
  Bell,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock,
  Croissant,
  Loader2,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { askLocal } from "@/lib/ask";
import { submitStaffTicket, categoryFromGuestText } from "@/lib/tickets-store";
import { isUrgentRequest, staffNeedKind, type StaffNeedKind } from "@/lib/receptionist";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";
import { ActionChips } from "@/components/assistant/ActionChips";
import { LanguageMenu } from "@/components/assistant/LanguageMenu";

type Escalation = {
  category: "reception" | "housekeeping" | "maintenance" | "dining" | "late_checkout";
  details: string;
  escalated?: boolean;
  ticketId?: string;
};

interface Message {
  id: string;
  sender: "airpal" | "guest";
  text: string;
  time: string;
  escalation?: Escalation;
}

const QUICK_PROMPTS = [
  { id: "wifi", label: "Wi-Fi details", icon: Wifi, query: "What is the Wi-Fi network and password?" },
  { id: "breakfast", label: "Breakfast hours", icon: Croissant, query: "When and where is breakfast served?" },
  { id: "checkout", label: "Check-out time", icon: Clock, query: "What time is checkout and can I get late checkout?" },
  { id: "towels", label: "Towels & linen", icon: BedDouble, query: "Can I request fresh towels and extra pillows?" },
  { id: "pool", label: "Pool & gym", icon: Waves, query: "Where is the swimming pool and gym and what are the hours?" },
  { id: "taxi", label: "Airport transport", icon: CarFront, query: "How do I get to the airport or book a taxi?" },
];

function staffReply(kind: Exclude<StaffNeedKind, "general">, room: string, checkOut: string): string {
  const where = room ? `Room ${room}` : "your room";
  switch (kind) {
    case "linen":
      return `I can certainly help arrange that for ${where}! Our housekeeping team can deliver fresh towels/linen right away.`;
    case "late_checkout":
      return `Standard check-out is at ${checkOut}. Late check-out requests are subject to availability. I can notify the front desk manager to review and approve your request.`;
    case "maintenance":
      return "I apologize for the inconvenience with your room amenities. I can escalate a priority maintenance ticket to our duty team immediately.";
    case "cleaning":
      return `I'll be happy to notify housekeeping for a room refresh or touch-up for ${where}.`;
  }
}

function EscalationCard({
  escalation,
  escalating,
  onEscalate,
}: {
  escalation: Escalation;
  escalating: boolean;
  onEscalate: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border-l-4 border-l-amber-400 bg-paper p-3 ring-1 ring-line">
      <div className="flex items-start gap-2">
        <Bell size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">Smart Staff Escalation</p>
          <p className="mt-0.5 text-[11px] text-mute">
            {escalation.escalated
              ? "Dispatched directly to the front desk team."
              : "Tap to notify front desk staff to attend to your room."}
          </p>
        </div>
      </div>

      {escalation.escalated ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600">
          <CheckCircle2 size={14} aria-hidden />
          <span>Staff Ticket Active · Help is on the way</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={escalating}
          onClick={onEscalate}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-xs transition hover:bg-amber-300 active:scale-95 disabled:opacity-50"
        >
          {escalating ? (
            <>
              <Loader2 size={13} className="animate-spin" aria-hidden />
              <span>Escalating to Desk…</span>
            </>
          ) : (
            <>
              <span>Escalate to Front Desk</span>
              <ChevronRight size={13} aria-hidden />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function AirPalAiReceptionist() {
  const { property, session, roomLabel } = useStay();
  const { now, timeZone } = useLocalNow();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const propertyName = property.name || "your hotel";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "airpal",
      text: `G'day! I'm AirPal AI, your 24/7 AI Receptionist at ${propertyName}. I can answer questions in multiple languages, give local tips, or escalate requests directly to our front desk team. How can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen, messages, isTyping]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isTyping) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const guestMsg: Message = {
      id: `guest_${Date.now()}`,
      sender: "guest",
      text: textToSend,
      time: timeStr,
    };

    setMessages((prev) => [...prev, guestMsg]);
    if (!customText) setInput("");
    setIsTyping(true);
    void triggerHaptic("light");

    void track("ask_submitted", {
      contextId: session.propertyId || property.id,
      questionCategory: "airpal_ai_receptionist",
      lang: selectedLang,
    });

    setTimeout(async () => {
      const localAns = askLocal(textToSend, {
        room: roomLabel || undefined,
        property,
        now,
        timeZone,
      });

      let replyText = localAns.body;
      const need = staffNeedKind(textToSend);
      let escalationInfo: Message["escalation"] = undefined;

      if (need) {
        escalationInfo = {
          category: categoryFromGuestText(textToSend),
          details: textToSend,
          escalated: false,
        };
        if (need !== "general") {
          replyText = staffReply(need, roomLabel || "", property.checkOut || "11:00 AM");
        }
      }

      const airpalMsg: Message = {
        id: `airpal_${Date.now()}`,
        sender: "airpal",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        escalation: escalationInfo,
      };

      setMessages((prev) => [...prev, airpalMsg]);
      setIsTyping(false);
      void triggerHaptic("success");
    }, 700);
  };

  const handleEscalate = async (
    msgId: string,
    details: string,
    category: NonNullable<Message["escalation"]>["category"],
  ) => {
    if (!property.id || property.id === "unknown") {
      toast.error("This property is in preview mode. Please speak with front desk.");
      return;
    }

    setEscalatingId(msgId);
    try {
      const roomNum = roomLabel || "Guest";
      const savedTicket = await submitStaffTicket({
        propertyId: property.id,
        details,
        roomNumber: roomNum,
        category: category || "reception",
        urgency: isUrgentRequest(details) ? "urgent" : "normal",
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                escalation: m.escalation ? { ...m.escalation, escalated: true, ticketId: savedTicket.id } : undefined,
              }
            : m,
        ),
      );

      void triggerHaptic("success");
      toast.success("Ticket dispatched to Front Desk", {
        description: `Staff notified for Room ${roomNum}. Ticket #${savedTicket.id.slice(-5)}`,
      });

      const confirmMsg: Message = {
        id: `airpal_conf_${Date.now()}`,
        sender: "airpal",
        text: `Done! I've sent a priority ticket to the front desk team for Room ${roomNum}. A team member will attend to this promptly.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reach staff. Please call front desk.");
    } finally {
      setEscalatingId(null);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          type="button"
          aria-label="Chat with AirPal AI, 24/7 AI Receptionist"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl ring-2 ring-white/20 transition-colors duration-150 hover:bg-brand/90 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
        >
          <Sparkles className="h-6 w-6 text-amber-300" aria-hidden />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in sm:items-center sm:justify-end sm:p-6">
          <div className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-card shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom duration-300 sm:h-[620px] sm:w-[420px] sm:rounded-[28px]">
            <div className="relative bg-brand p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner ring-1 ring-white/25 backdrop-blur-md">
                      <Sparkles size={20} className="text-amber-300" aria-hidden />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-brand"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-base font-extrabold text-white">AirPal AI</h3>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                        AI Receptionist
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white/80">24/7 Stay &amp; Guide Assistant</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <LanguageMenu value={selectedLang} onChange={setSelectedLang} />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25 hover:text-white"
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/70">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck size={13} className="text-emerald-300" aria-hidden />
                  {roomLabel ? `Connected to Room ${roomLabel}` : propertyName}
                </span>
                {property.phone && (
                  <a
                    href={`tel:${property.phone}`}
                    className="flex items-center gap-1 font-bold text-amber-300 hover:underline"
                  >
                    <PhoneCall size={12} aria-hidden /> Call Desk
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3.5 overflow-y-auto bg-paper/50 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === "guest" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-[14px] leading-relaxed shadow-xs ${
                      msg.sender === "guest"
                        ? "rounded-br-xs bg-brand font-medium text-white"
                        : "rounded-bl-xs bg-card text-ink ring-1 ring-line"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {msg.escalation && (
                      <EscalationCard
                        escalation={msg.escalation}
                        escalating={escalatingId === msg.id}
                        onEscalate={() =>
                          msg.escalation && handleEscalate(msg.id, msg.escalation.details, msg.escalation.category)
                        }
                      />
                    )}
                  </div>
                  <span className="mt-1 px-1 text-[10px] font-medium text-mute">{msg.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex w-fit items-center gap-1.5 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-line">
                  <div className="h-2 w-2 rounded-full bg-brand motion-safe:animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ActionChips
              ariaLabel="Suggested questions"
              actions={QUICK_PROMPTS.map((qp) => ({
                id: qp.id,
                label: qp.label,
                icon: qp.icon,
                run: () => handleSend(qp.query),
              }))}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-line bg-card p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AirPal AI anything (Wi-Fi, towels, food…)"
                aria-label="Ask AirPal AI anything"
                className="h-11 flex-1 rounded-full bg-paper px-4 text-sm font-medium text-ink outline-none ring-1 ring-line placeholder:text-mute focus:ring-2 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-xs transition hover:bg-brand/90 active:scale-95 disabled:opacity-40"
              >
                <Send size={16} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Export alias for backward compatibility
export const EliAiReceptionist = AirPalAiReceptionist;
