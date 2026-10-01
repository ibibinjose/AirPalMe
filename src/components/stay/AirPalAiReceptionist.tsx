import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bell,
  CheckCircle2,
  Globe,
  ShieldCheck,
  ChevronRight,
  PhoneCall,
  Loader2,
} from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { askLocal } from "@/lib/ask";
import { submitStaffTicket, categoryFromGuestText } from "@/lib/tickets-store";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";

interface Message {
  id: string;
  sender: "airpal" | "guest";
  text: string;
  time: string;
  escalation?: {
    category: "reception" | "housekeeping" | "maintenance" | "dining" | "late_checkout";
    details: string;
    escalated?: boolean;
    ticketId?: string;
  };
}

const QUICK_PROMPTS = [
  { label: "📶 Wi-Fi details", query: "What is the Wi-Fi network and password?" },
  { label: "🥐 Breakfast hours", query: "When and where is breakfast served?" },
  { label: "🕒 Check-out time", query: "What time is checkout and can I get late checkout?" },
  { label: "🛏️ Extra towels / linen", query: "Can I request fresh towels and extra pillows?" },
  { label: "🏊 Pool & Gym hours", query: "Where is the swimming pool and gym and what are the hours?" },
  { label: "🚕 Airport transport", query: "How do I get to the airport or book a taxi?" },
];

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇦🇪" },
];

export function AirPalAiReceptionist() {
  const { property, session, roomLabel } = useStay();
  const { now, timeZone } = useLocalNow();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [showLangMenu, setShowLangMenu] = useState(false);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
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

    // Track Ask interaction
    void track("ask_submitted", {
      contextId: session.propertyId || property.id,
      questionCategory: "airpal_ai_receptionist",
      lang: selectedLang,
    });

    // Generate smart AI response & check for physical staff action escalation
    setTimeout(async () => {
      const q = textToSend.toLowerCase();
      const localAns = askLocal(textToSend, {
        room: roomLabel || undefined,
        property,
        now,
        timeZone,
      });

      let replyText = localAns.body;

      // Detect if the guest needs physical staff action (Towels, Cleaning, AC, Late checkout, Taxi, Maintenance)
      const needsStaffAction =
        /towel|pillow|blanket|housekeep|clean|linen|amenity|ac|air.?con|plumb|leak|broken|fix|maintenance|late\s*(out|checkout)|taxi|shuttle|luggage|key|door/i.test(
          q,
        );

      let escalationInfo: Message["escalation"] = undefined;

      if (needsStaffAction) {
        const cat = categoryFromGuestText(textToSend);
        escalationInfo = {
          category: cat,
          details: textToSend,
          escalated: false,
        };

        if (/towel|pillow|blanket|linen/i.test(q)) {
          replyText = `I can certainly help arrange that for ${roomLabel ? `Room ${roomLabel}` : "your room"}! Our housekeeping team can deliver fresh towels/linen right away.`;
        } else if (/late\s*(out|checkout)/i.test(q)) {
          replyText = `Standard check-out is at ${property.checkOut || "11:00 AM"}. Late check-out requests are subject to availability. I can notify the front desk manager to review and approve your request.`;
        } else if (/ac|air.?con|leak|broken|fix|maintenance/i.test(q)) {
          replyText = `I apologize for the inconvenience with your room amenities. I can escalate a priority maintenance ticket to our duty team immediately.`;
        } else if (/clean|housekeep/i.test(q)) {
          replyText = `I'll be happy to notify housekeeping for a room refresh or touch-up for ${roomLabel ? `Room ${roomLabel}` : "your room"}.`;
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
        urgency: /urgent|leak|emergency/i.test(details) ? "urgent" : "normal",
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

      // AirPal AI confirmation follow-up
      const confirmMsg: Message = {
        id: `airpal_conf_${Date.now()}`,
        sender: "airpal",
        text: `✅ Done! I've sent a priority ticket to the front desk team for Room ${roomNum}. A team member will attend to this promptly.`,
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
      {/* Floating Trigger Button (Bottom-Right, Apple Liquid Glass style) */}
      <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          type="button"
          aria-label="Chat with AirPal AI, 24/7 AI Receptionist"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl ring-2 ring-white/20 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand/40"
        >
          {/* Glowing pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-brand/30 animate-ping pointer-events-none opacity-75" />

          <Sparkles className="h-6 w-6 text-amber-300 transition group-hover:rotate-12" />

          {/* Unread badge */}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white ring-2 ring-white shadow-md animate-bounce">
              1
            </span>
          )}
        </button>
      </div>

      {/* Slide-over / Modal Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="relative flex flex-col h-[85vh] sm:h-[620px] w-full sm:w-[420px] rounded-t-[32px] sm:rounded-[28px] bg-card ring-1 ring-line shadow-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-brand via-[#1e07b8] to-[#12048f] p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 shadow-inner backdrop-blur-md">
                      <Sparkles size={20} className="text-amber-300" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-brand" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-base font-extrabold text-white">AirPal AI</h3>
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                        AI Receptionist
                      </span>
                    </div>
                    <p className="text-xs text-white/80 font-medium">24/7 Stay &amp; Guide Assistant</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Language Selector Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLangMenu((prev) => !prev)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 hover:bg-white/25 hover:text-white transition text-xs"
                      title="Select Language"
                    >
                      <Globe size={15} />
                    </button>
                    {showLangMenu && (
                      <div className="absolute right-0 top-10 z-20 w-36 rounded-2xl bg-card p-1.5 shadow-xl ring-1 ring-line text-ink border border-line">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mute">Language</p>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              setSelectedLang(lang.code);
                              setShowLangMenu(false);
                              toast.success(`Language set to ${lang.label}`);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                              selectedLang === lang.code ? "bg-brand text-white" : "hover:bg-paper"
                            }`}
                          >
                            <span>
                              {lang.flag} {lang.label}
                            </span>
                            {selectedLang === lang.code && <CheckCircle2 size={12} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 hover:bg-white/25 hover:text-white transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Bar */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/70 border-t border-white/10 pt-2">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck size={13} className="text-emerald-300" />
                  {roomLabel ? `Connected to Room ${roomLabel}` : propertyName}
                </span>
                {property.phone && (
                  <a
                    href={`tel:${property.phone}`}
                    className="flex items-center gap-1 font-bold text-amber-300 hover:underline"
                  >
                    <PhoneCall size={12} /> Call Desk
                  </a>
                )}
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-paper/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === "guest" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs text-[14px] leading-relaxed ${
                      msg.sender === "guest"
                        ? "bg-brand text-white rounded-br-xs font-medium"
                        : "bg-card text-ink ring-1 ring-line rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Smart Staff Escalation Card */}
                    {msg.escalation && (
                      <div className="mt-3 rounded-xl bg-paper p-3 ring-1 ring-line border-l-4 border-l-amber-400">
                        <div className="flex items-start gap-2">
                          <Bell size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink">Smart Staff Escalation</p>
                            <p className="text-[11px] text-mute mt-0.5">
                              {msg.escalation.escalated
                                ? "Dispatched directly to the front desk team."
                                : "Tap to notify front desk staff to attend to your room."}
                            </p>
                          </div>
                        </div>

                        {msg.escalation.escalated ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                            <CheckCircle2 size={14} />
                            <span>Staff Ticket Active · Help is on the way</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={escalatingId === msg.id}
                            onClick={() => handleEscalate(msg.id, msg.escalation!.details, msg.escalation!.category)}
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3 py-2 text-xs font-black text-slate-950 shadow-xs transition active:scale-95 disabled:opacity-50"
                          >
                            {escalatingId === msg.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Escalating to Desk…</span>
                              </>
                            ) : (
                              <>
                                <span>Escalate to Front Desk</span>
                                <ChevronRight size={13} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-mute font-medium px-1">{msg.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-line w-fit">
                  <div className="h-2 w-2 rounded-full bg-brand animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="border-t border-line bg-card px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp.query)}
                  className="shrink-0 rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-brand hover:text-white transition active:scale-95 shadow-xs"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
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
                className="flex-1 rounded-full bg-paper px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand font-medium placeholder:text-mute"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-xs transition hover:bg-brand/90 active:scale-95 disabled:opacity-40"
              >
                <Send size={16} />
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
