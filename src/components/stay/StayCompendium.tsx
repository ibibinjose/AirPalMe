import { useState, useMemo, useEffect } from "react";
import {
  PhoneCall,
  Wifi,
  Clock,
  Coffee,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  LogIn,
  LogOut,
  Luggage,
  Receipt,
  X,
  Sparkles,
} from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { fetchPropertyMenu } from "@/lib/properties";
import { submitStaffTicket } from "@/lib/tickets-store";
import type { MenuItem } from "@shared/airpal-data";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";
import { AirPalChatModal } from "@/components/messaging/AirPalChatModal";
import { createConversationRecord } from "@/lib/chat-store";
import type { UniversalConversation } from "@shared/messaging";

export function StayCompendium() {
  const { property, roomLabel } = useStay();

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    welcome: true,
    dining: false,
    wifi: false,
    phone: false,
    housekeeping: false,
    facilities: false,
    transport: false,
  });

  // AirPal Universal Chat Modal State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatConv, setChatConv] = useState<UniversalConversation | null>(null);

  // Digital Check-In & Check-Out Modal States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInName, setCheckInName] = useState("");
  const [checkInAgreed, setCheckInAgreed] = useState(false);
  const [needLuggageStorage, setNeedLuggageStorage] = useState(false);
  const [needAirportTaxi, setNeedAirportTaxi] = useState(false);

  // Dining Menu & Ordering State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderRoom, setOrderRoom] = useState(roomLabel || "");
  const [isOrdering, setIsOrdering] = useState(false);

  // Housekeeping Quick Request State
  const [housekeepingRequest, setHousekeepingRequest] = useState("");
  const [isSendingHk, setIsSendingHk] = useState(false);
  const [hkSuccess, setHkSuccess] = useState(false);

  // Copy Wi-Fi state
  const [wifiCopied, setWifiCopied] = useState(false);

  useEffect(() => {
    if (roomLabel) setOrderRoom(roomLabel);
  }, [roomLabel]);

  useEffect(() => {
    let active = true;
    // Never invent a menu: empty means the stay hasn't published one yet.
    if (!property.id || property.id === "unknown") {
      setMenuItems([]);
      return;
    }
    fetchPropertyMenu(property.id).then((items) => {
      if (active) {
        if (items && items.length > 0) {
          setMenuItems(items.filter((i) => i.available !== false));
        } else {
          setMenuItems([]);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [property.id]);

  const toggleAccordion = (key: string) => {
    void triggerHaptic("light");
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWifi = async () => {
    // Never invent a password: empty means "ask the desk", never a seed fallback.
    const pwd = property.wifi?.password || "";
    if (!pwd) {
      toast.info("Ask the front desk for the Wi-Fi password.");
      return;
    }
    try {
      await navigator.clipboard.writeText(pwd);
      setWifiCopied(true);
      void triggerHaptic("success");
      toast.success("Wi-Fi password copied!");
      setTimeout(() => setWifiCopied(false), 2500);
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const handleOrderDining = async () => {
    const itemsCount = Object.values(orderCart).reduce((a, b) => a + b, 0);
    if (itemsCount === 0) {
      toast.error("Please select at least one item from the menu.");
      return;
    }
    const targetRoom = orderRoom.trim() || roomLabel || "Guest";
    setIsOrdering(true);
    try {
      const summary = Object.entries(orderCart)
        .map(([id, qty]) => {
          const itm = menuItems.find((m) => m.id === id);
          return `${qty}x ${itm?.name || "Item"}`;
        })
        .join(", ");

      if (property.id && property.id !== "unknown") {
        await submitStaffTicket({
          propertyId: property.id,
          details: `In-Room Dining Order: ${summary} (Deliver to Room ${targetRoom})`,
          roomNumber: targetRoom,
          category: "dining",
          urgency: "normal",
        });
      }

      void triggerHaptic("success");
      toast.success("Order received by the kitchen!", {
        description: `Delivering to Room ${targetRoom}. Total: A$${totalOrderPrice.toFixed(2)}`,
      });
      setOrderCart({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send order to kitchen");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleQuickHousekeeping = async (item: string) => {
    const targetRoom = roomLabel || "Guest";
    setIsSendingHk(true);
    setHousekeepingRequest(item);
    try {
      if (property.id && property.id !== "unknown") {
        await submitStaffTicket({
          propertyId: property.id,
          details: `Housekeeping Request: ${item} for Room ${targetRoom}`,
          roomNumber: targetRoom,
          category: "housekeeping",
          urgency: "normal",
        });
      }
      void triggerHaptic("success");
      setHkSuccess(true);
      toast.success("Housekeeping request sent", {
        description: `Our team will bring ${item.toLowerCase()} to Room ${targetRoom}.`,
      });
      setTimeout(() => {
        setHkSuccess(false);
        setHousekeepingRequest("");
      }, 3000);
    } catch (_err) {
      toast.error("Failed to send request. Please contact reception.");
    } finally {
      setIsSendingHk(false);
    }
  };

  const totalOrderPrice = useMemo(() => {
    return Object.entries(orderCart).reduce((sum, [id, qty]) => {
      const itm = menuItems.find((m) => m.id === id);
      return sum + (itm?.price || 0) * qty;
    }, 0);
  }, [orderCart, menuItems]);

  const propertyName = property.name || "AirPal Stay";

  return (
    <div className="mx-auto max-w-lg px-0 pb-2 pt-1 font-sans text-ink">
      {/* Stay actions + guide sections. Property identity (name, tagline,
          location, share) lives in the Stay & Guide shell hero above — never
          repeated here. */}
      {/* Hero Action Buttons (Exact layout from reference) */}
      <div className="mt-5 space-y-2.5">
        {/* Banner 1: Live Chat with Front Desk & AirPal AI */}
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            const stayId = property.id || "unknown";
            const conv = createConversationRecord({
              type: "stay",
              targetId: stayId,
              title: `${property.name || "Stay"} Front Desk & AI`,
              photo: property.heroImage,
              userUid: "guest",
              userName: "Guest",
              peerUid: stayId,
              peerName: property.name || "Front Desk",
            });
            setChatConv(conv);
            setShowChatModal(true);
          }}
          className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-brand hover:brightness-110 px-4 py-3.5 text-center text-sm font-black text-white shadow-md transition active:scale-[0.98]"
        >
          <Sparkles size={18} className="text-amber-300" />
          <span>Chat with Front Desk &amp; AirPal AI</span>
        </button>

        {/* Call Reception — only a real published number ever dials */}
        {property.phone ? (
          <a
            href={`tel:${property.phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card border border-line px-4 py-3.5 text-center text-sm font-bold text-ink hover:bg-paper shadow-xs transition active:scale-[0.98]"
          >
            <PhoneCall size={16} className="text-brand" />
            <span>Call Reception</span>
          </a>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card border border-line px-4 py-3.5 text-center text-sm font-bold text-mute shadow-xs">
            <PhoneCall size={16} />
            <span>Reception number not listed — ask at the desk</span>
          </div>
        )}
      </div>

      {/* Quick Highlight Info Cards (Wi-Fi, Breakfast, Check-in/out) */}
      <div className="mt-4 space-y-2.5">
        {/* Wi-Fi Card */}
        <div
          onClick={handleCopyWifi}
          className="cursor-pointer group flex items-center justify-between rounded-2xl bg-[#fff2ee] dark:bg-[#2a130e] p-4 ring-1 ring-[#f9d3c7] dark:ring-[#472218] transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f03a17]/15 text-[#f03a17]">
              <Wifi size={22} />
            </div>
            <div>
              <p className="text-[13px] font-extrabold text-ink">{property.wifi?.network || "Wi-Fi — ask reception"}</p>
              <p className="text-[11px] text-mute font-medium mt-0.5">
                {property.wifi?.password ? (
                  <>
                    Password: <span className="font-mono font-bold text-ink">{property.wifi.password}</span> (Tap to
                    copy)
                  </>
                ) : (
                  "Ask the front desk for the password"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-card text-ink shadow-xs"
          >
            {wifiCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Breakfast card — bound to the stay's published breakfast hours */}
        <div className="flex items-center gap-3 rounded-2xl bg-[#fff2ee] dark:bg-[#2a130e] p-3.5 ring-1 ring-[#f9d3c7] dark:ring-[#472218]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f03a17]/15 text-[#f03a17]">
            <Coffee size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-mute">Breakfast</p>
            <p className="text-[13px] font-extrabold text-ink">{property.breakfast?.hours || "Ask reception"}</p>
            {property.breakfast?.location ? (
              <p className="text-[11px] font-medium text-mute">{property.breakfast.location}</p>
            ) : null}
          </div>
        </div>

        {/* Check-In / Check-Out Card with Interactive Actions */}
        <div className="rounded-2xl bg-[#fff2ee] dark:bg-[#2a130e] p-4 ring-1 ring-[#f9d3c7] dark:ring-[#472218] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f03a17]/15 text-[#f03a17]">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-mute">Check-In</p>
                <p className="text-[13px] font-extrabold text-ink">{property.checkIn || "Ask reception"}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-line" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">Check-Out</p>
              <p className="text-[13px] font-extrabold text-ink">{property.checkOut || "Ask reception"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#f9d3c7] dark:border-[#472218] pt-2.5">
            <button
              type="button"
              onClick={() => {
                setShowCheckInModal(true);
                void triggerHaptic("light");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition active:scale-95 shadow-xs ${
                isCheckedIn ? "bg-emerald-600 text-white" : "bg-[#f03a17] text-white hover:bg-[#d83212]"
              }`}
            >
              {isCheckedIn ? <CheckCircle2 size={13} /> : null}
              <span>{isCheckedIn ? "Checked In" : "Digital Check-In"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCheckOutModal(true);
                void triggerHaptic("light");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition active:scale-95 shadow-xs ${
                isCheckedOut
                  ? "bg-slate-700 text-white"
                  : "bg-white dark:bg-card text-ink ring-1 ring-line hover:bg-paper"
              }`}
            >
              {isCheckedOut ? <CheckCircle2 size={13} /> : null}
              <span>{isCheckedOut ? "Checked Out" : "Express Check-Out"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stay guide accordions (replaces binders & PDFs) */}
      <div className="mt-6 space-y-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-mute px-1">Good to know</p>

        {/* 1. Welcome & House Rules */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("welcome")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">👋</span>
              <span className="text-sm font-extrabold">Welcome &amp; House Rules</span>
            </span>
            {openAccordions.welcome ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.welcome && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2 text-xs text-ink/80 leading-relaxed font-medium">
              <p>
                Welcome to <strong>{propertyName}</strong>! This guide has your Wi-Fi, dining, housekeeping requests and
                local tips in one place.
              </p>
              <div className="mt-2 space-y-1.5 rounded-xl bg-card p-3 ring-1 ring-line">
                <p className="font-bold text-ink">🔑 Key Information:</p>
                <ul className="list-disc list-inside space-y-1 text-mute">
                  <li>House rules aren’t published here yet — ask reception for this stay’s rules.</li>
                  <li>Questions at 2am? Tap the chat bubble to ask AirPal, your 24/7 AI Receptionist.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 2. In-Room Dining & Kitchen Menu */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("dining")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🛎️</span>
              <span className="text-sm font-extrabold">In-Room Dining</span>
            </span>
            {openAccordions.dining ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.dining && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-3">
              {menuItems.length > 0 ? (
                <p className="text-xs text-mute font-medium">Order from the kitchen below — charged to your room.</p>
              ) : (
                <p className="text-xs text-mute font-medium">
                  No menu published yet — ask reception what the kitchen is serving.
                </p>
              )}

              <div className="space-y-2.5">
                {menuItems.map((item) => {
                  const qty = orderCart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-line shadow-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-extrabold text-ink">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-mute line-clamp-1 mt-0.5">{item.description}</p>
                        )}
                        <p className="text-xs font-black text-brand mt-1">A${item.price.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setOrderCart((prev) => {
                                const next = { ...prev };
                                if (qty <= 1) delete next[item.id];
                                else next[item.id] = qty - 1;
                                return next;
                              })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-paper ring-1 ring-line text-ink active:scale-95"
                          >
                            <Minus size={13} />
                          </button>
                        )}
                        {qty > 0 && <span className="w-5 text-center text-xs font-black">{qty}</span>}
                        <button
                          type="button"
                          onClick={() => setOrderCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-xs active:scale-95"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Checkout Box */}
              {Object.keys(orderCart).length > 0 && (
                <div className="mt-3 rounded-2xl bg-brand/5 p-3.5 ring-1 ring-brand/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Room for Delivery:</span>
                    <input
                      type="text"
                      value={orderRoom}
                      onChange={(e) => setOrderRoom(e.target.value)}
                      placeholder="e.g. 204"
                      className="h-8 w-24 rounded-lg bg-card px-2 text-center text-xs font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-line pt-2">
                    <span className="text-sm font-extrabold text-ink">Total: A${totalOrderPrice.toFixed(2)}</span>
                    <button
                      type="button"
                      disabled={isOrdering}
                      onClick={handleOrderDining}
                      className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-black text-white shadow-md hover:bg-brand/90 active:scale-95 disabled:opacity-50"
                    >
                      <ShoppingBag size={14} />
                      <span>{isOrdering ? "Placing Order…" : "Order & Charge Room"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Staff picks render once, in the shell's Host recommends section above. */}
        {/* 3. Wi-Fi Details */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("wifi")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📶</span>
              <span className="text-sm font-extrabold">Wifi</span>
            </span>
            {openAccordions.wifi ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.wifi && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-line">
                <div>
                  <p className="text-[10px] font-black uppercase text-mute">Network</p>
                  <p className="font-bold text-ink">{property.wifi?.network || "Ask reception"}</p>
                  <p className="text-[10px] font-black uppercase text-mute mt-2">Password</p>
                  <p className="font-mono font-extrabold text-ink">{property.wifi?.password || "Ask the front desk"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyWifi}
                  className="flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Phone Directory */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("phone")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📞</span>
              <span className="text-sm font-extrabold">Phone Directory</span>
            </span>
            {openAccordions.phone ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.phone && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {property.phone ? (
                  <a
                    href={`tel:${property.phone}`}
                    className="rounded-xl bg-card p-3 ring-1 ring-line block hover:bg-paper"
                  >
                    <p className="font-bold text-ink">Front Desk / Concierge</p>
                    <p className="text-brand font-extrabold mt-1">Dial 9 or {property.phone}</p>
                  </a>
                ) : (
                  <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                    <p className="font-bold text-ink">Front Desk / Concierge</p>
                    <p className="text-mute font-bold mt-1">Number not listed — ask at the desk</p>
                  </div>
                )}
                <a href="tel:000" className="rounded-xl bg-card p-3 ring-1 ring-line block hover:bg-paper">
                  <p className="font-bold text-ink">Emergency (AU)</p>
                  <p className="text-red-500 font-extrabold mt-1">Dial 000 / 112</p>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 5. Housekeeping Service */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("housekeeping")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🛏️</span>
              <span className="text-sm font-extrabold">Housekeeping Service</span>
            </span>
            {openAccordions.housekeeping ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.housekeeping && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-3 text-xs">
              <p className="text-mute font-medium">1-Tap Amenities &amp; Room Service Requests:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Fresh Towels",
                  "Extra Pillow",
                  "Toiletries Kit",
                  "Room Cleaning",
                  "Iron & Board",
                  "Late Check-Out",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={isSendingHk}
                    onClick={() => handleQuickHousekeeping(item)}
                    className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-line hover:bg-paper transition active:scale-95 disabled:opacity-50"
                  >
                    <span className="font-bold text-ink">{item}</span>
                    <Plus size={13} className="text-brand" />
                  </button>
                ))}
              </div>
              {hkSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 font-bold">
                  <CheckCircle2 size={16} />
                  <span>Request for {housekeepingRequest} sent to Front Desk!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Hotel Facilities — bound to the stay's published facilities */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("facilities")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🏢</span>
              <span className="text-sm font-extrabold">Hotel Facilities</span>
            </span>
            {openAccordions.facilities ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.facilities && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2 text-xs">
              {(property.facilities || []).length > 0 ? (
                <div className="space-y-2">
                  {(property.facilities || []).map((facility, index) => {
                    const where = [facility.floor, facility.hours].filter(Boolean).join(" · ");
                    const extra = facility.details || facility.description || "";
                    return (
                      <div
                        key={facility.id || `${facility.name}-${index}`}
                        className="rounded-xl bg-card p-3 ring-1 ring-line"
                      >
                        <p className="font-bold text-ink">
                          {facility.icon ? `${facility.icon} ` : ""}
                          {facility.name}
                        </p>
                        {where ? <p className="text-mute mt-0.5">{where}</p> : null}
                        {extra ? <p className="text-mute mt-0.5">{extra}</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-mute font-medium">No facilities listed yet — ask reception.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The shell renders the one floating AI Receptionist — never twice. */}
      {/* Digital Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[28px] bg-card p-6 ring-1 ring-line shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowCheckInModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-mute hover:text-ink"
            >
              <X size={16} />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <LogIn size={28} />
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl font-black text-ink">Digital Check-In</h3>
              <p className="text-xs text-mute mt-1">
                Fast guest registration &amp; instant room key access for {propertyName}
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-mute">Guest Full Name</label>
                <input
                  type="text"
                  value={checkInName}
                  onChange={(e) => setCheckInName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="mt-1 h-10 w-full rounded-xl bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-mute">Room Number</label>
                  <div className="mt-1 flex h-10 items-center rounded-xl bg-paper px-3 text-xs font-bold text-ink ring-1 ring-line">
                    {roomLabel ? `Room ${roomLabel}` : "Auto-Assigned"}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-mute">Check-In Time</label>
                  <div className="mt-1 flex h-10 items-center rounded-xl bg-paper px-3 text-xs font-bold text-ink ring-1 ring-line">
                    {property.checkIn || "Ask reception"}
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkInAgreed}
                  onChange={(e) => setCheckInAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-brand focus:ring-brand"
                />
                <span className="text-[11px] text-mute font-medium leading-snug">
                  I confirm my ID matches this reservation and agree to the hotel house rules &amp; quiet hours.
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!checkInAgreed || isCheckedIn}
              onClick={() => {
                setIsCheckedIn(true);
                setShowCheckInModal(false);
                void triggerHaptic("success");
                if (property.id && property.id !== "unknown") {
                  void submitStaffTicket({
                    propertyId: property.id,
                    details: `Digital Check-In Completed: ${checkInName.trim() || "Guest"} (Room ${roomLabel || "Assigned"})`,
                    roomNumber: roomLabel || "Guest",
                    category: "reception",
                    urgency: "normal",
                  });
                }
                toast.success("Check-In Complete! Welcome to your stay.", {
                  description: `Reception has been notified for Room ${roomLabel || "Guest"}.`,
                });
              }}
              className="w-full rounded-full bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-black text-white shadow-md active:scale-95 disabled:opacity-40"
            >
              {isCheckedIn ? "Checked In Successfully" : "Complete Digital Check-In"}
            </button>
          </div>
        </div>
      )}

      {/* Express Check-Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[28px] bg-card p-6 ring-1 ring-line shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowCheckOutModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-mute hover:text-ink"
            >
              <X size={16} />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
              <LogOut size={28} />
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl font-black text-ink">Express Check-Out</h3>
              <p className="text-xs text-mute mt-1">
                Room {roomLabel || "Guest"} · {propertyName}
              </p>
            </div>

            {/* Folio note — AirPal never invents a billing balance */}
            <div className="rounded-2xl bg-paper p-3.5 ring-1 ring-line space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-ink">
                <span className="flex items-center gap-1.5">
                  <Receipt size={14} className="text-brand" />
                  <span>Stay Folio Balance</span>
                </span>
              </div>
              <p className="text-[11px] text-mute leading-snug">
                Ask reception for your folio balance — room charges are settled at the desk, not in this guide.
              </p>
            </div>

            {/* Departure Options */}
            <div className="space-y-2 text-left">
              <label className="flex items-center justify-between rounded-xl bg-paper p-2.5 ring-1 ring-line cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Luggage size={15} className="text-amber-500" />
                  <span>Request Luggage Storage</span>
                </span>
                <input
                  type="checkbox"
                  checked={needLuggageStorage}
                  onChange={(e) => setNeedLuggageStorage(e.target.checked)}
                  className="rounded text-brand focus:ring-brand"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl bg-paper p-2.5 ring-1 ring-line cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-bold text-ink">
                  <span className="text-sm">🚕</span>
                  <span>Call Airport Taxi / Rideshare</span>
                </span>
                <input
                  type="checkbox"
                  checked={needAirportTaxi}
                  onChange={(e) => setNeedAirportTaxi(e.target.checked)}
                  className="rounded text-brand focus:ring-brand"
                />
              </label>
            </div>

            <div className="rounded-xl bg-amber-400/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium text-center">
              🔑 Please return room keys as instructed by reception.
            </div>

            <button
              type="button"
              disabled={isCheckedOut}
              onClick={() => {
                setIsCheckedOut(true);
                setShowCheckOutModal(false);
                void triggerHaptic("success");
                if (property.id && property.id !== "unknown") {
                  const extras = [];
                  if (needLuggageStorage) extras.push("Luggage Storage Requested");
                  if (needAirportTaxi) extras.push("Airport Taxi Requested");
                  void submitStaffTicket({
                    propertyId: property.id,
                    details: `Express Check-Out Completed for Room ${roomLabel || "Guest"}${extras.length ? ` (${extras.join(", ")})` : ""}`,
                    roomNumber: roomLabel || "Guest",
                    category: "reception",
                    urgency: "normal",
                  });
                }
                toast.success("Check-Out Complete! Safe travels.", {
                  description: "Thank you for staying with us. We hope to welcome you back soon!",
                });
              }}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-black shadow-md active:scale-95 disabled:opacity-50"
            >
              {isCheckedOut ? "Checked Out" : "Confirm Express Check-Out"}
            </button>
          </div>
        </div>
      )}

      {/* AirPal Universal Chat with Front Desk & AI */}
      <AirPalChatModal
        open={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setChatConv(null);
        }}
        conversation={chatConv}
        propertyContext={property}
        onActionClick={(action) => {
          if (action === "copy_wifi") void handleCopyWifi();
          if (action === "view_dining") toggleAccordion("dining");
          if (action === "request_towels") void handleQuickHousekeeping("Fresh Towels");
          if (action === "late_checkout") setShowCheckOutModal(true);
        }}
      />
    </div>
  );
}
