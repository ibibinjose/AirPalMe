import { useState, useMemo, useEffect } from "react";
import {
  Share2,
  KeyRound,
  Wine,
  PhoneCall,
  Wifi,
  Clock,
  Coffee,
  ChevronDown,
  ChevronUp,
  Utensils,
  Check,
  Copy,
  Plus,
  Minus,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  LogIn,
  LogOut,
  Luggage,
  Receipt,
  X,
} from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { useLocation } from "wouter";
import { fetchPropertyMenu } from "@/lib/properties";
import { submitStaffTicket } from "@/lib/tickets-store";
import type { MenuItem } from "@shared/airpal-data";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";
import { AirPalAiReceptionist } from "./AirPalAiReceptionist";

type CategoryTab = "info" | "activities" | "tours" | "recommendations";

export function StayCompendium() {
  const { property, roomLabel } = useStay();
  const [, nav] = useLocation();

  const [activeTab, setActiveTab] = useState<CategoryTab>("info");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    welcome: true,
    dining: false,
    offers: false,
    palate: false,
    wifi: false,
    phone: false,
    housekeeping: false,
    facilities: false,
    transport: false,
  });

  // Door Code Modal State
  const [showDoorCodeModal, setShowDoorCodeModal] = useState(false);
  // Free Drink Voucher Modal State
  const [showDrinkModal, setShowDrinkModal] = useState(false);
  const [drinkClaimed, setDrinkClaimed] = useState(false);

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
    if (!property.id || property.id === "unknown") {
      setMenuItems(getFallbackMenu());
      return;
    }
    fetchPropertyMenu(property.id).then((items) => {
      if (active) {
        if (items && items.length > 0) {
          setMenuItems(items.filter((i) => i.available !== false));
        } else {
          setMenuItems(getFallbackMenu());
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

  const handleShare = async () => {
    void triggerHaptic("light");
    const shareData = {
      title: property.name || "AirPal Stay Compendium",
      text: `Digital Compendium & 24/7 Concierge for ${property.name || "our stay"}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* share dismissed */
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Stay link copied to clipboard!");
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const handleCopyWifi = async () => {
    const pwd = property.wifi?.password || "AirPalGuest2026";
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

  const propertyName = property.name || "Harbour Hotel & Suites";
  const propertyDesc =
    property.tagline ||
    "Modern and stylish boutique accommodation located in the vibrant city center. Enjoy 24/7 digital concierge, in-room dining, high-speed Wi-Fi, and personalized local experiences.";

  const brandLogoLetter = propertyName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4 md:px-0 font-sans text-ink">
      {/* Header Profile Section (FreeGuides Reference Style) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Avatar Circle with Badge */}
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand via-[#240cf0] to-[#0a0270] text-2xl font-black text-white shadow-md ring-2 ring-white">
              {property.heroImage ? (
                <img
                  src={property.heroImage}
                  alt={propertyName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                brandLogoLetter
              )}
            </div>
            {/* Top Verified / Partner Badge */}
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 ring-2 ring-white shadow-xs">
              ★
            </span>
          </div>

          <div>
            <h1 className="font-display text-xl font-extrabold text-ink leading-tight">
              {propertyName}
            </h1>
            <p className="text-xs text-mute font-semibold mt-0.5 flex items-center gap-1">
              <MapPin size={12} className="text-brand" />
              {property.city || property.address || "Sydney, Australia"}
            </p>
          </div>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share property link"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper ring-1 ring-line text-ink hover:bg-card active:scale-95 transition shadow-xs"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Property Short Bio / Description */}
      <div className="mt-4">
        <p className="text-[13px] text-ink/80 leading-relaxed font-normal line-clamp-3">
          {propertyDesc}
        </p>
      </div>

      {/* Hero Action Buttons (Exact layout from reference) */}
      <div className="mt-5 space-y-2.5">
        {/* Banner 1: Group Chat / Social Circles */}
        <button
          type="button"
          onClick={() => nav("/circle")}
          className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f03a17] hover:bg-[#d83212] px-4 py-3.5 text-center text-sm font-black text-white shadow-md transition active:scale-[0.98]"
        >
          <span className="text-base">👏</span>
          <span>Guest Group Chat</span>
          <span className="text-base">👏</span>
        </button>

        {/* Banner 2: Digital Key / Door Access */}
        <button
          type="button"
          onClick={() => setShowDoorCodeModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f03a17] hover:bg-[#d83212] px-4 py-3.5 text-center text-sm font-black text-white shadow-md transition active:scale-[0.98]"
        >
          <KeyRound size={17} />
          <span>Click to access door code</span>
        </button>

        {/* Split Banner: Free Drink Voucher | Call Reception */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowDrinkModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f03a17] hover:bg-[#d83212] px-3 py-3 text-center text-xs font-black text-white shadow-sm transition active:scale-[0.98]"
          >
            <Wine size={15} />
            <span>Get your free drink</span>
          </button>

          <a
            href={property.phone ? `tel:${property.phone}` : "tel:000"}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-card border border-line px-3 py-3 text-center text-xs font-bold text-ink hover:bg-paper shadow-xs transition active:scale-[0.98]"
          >
            <PhoneCall size={15} className="text-brand" />
            <span>Call Reception</span>
          </a>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-line pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "info", label: "General" },
          { id: "activities", label: "Activities" },
          { id: "tours", label: "Tours" },
          { id: "recommendations", label: "Recommendations" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as CategoryTab);
                void triggerHaptic("light");
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition active:scale-95 ${
                isActive
                  ? "bg-[#f03a17] text-white shadow-xs"
                  : "text-mute hover:text-ink hover:bg-paper font-bold"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
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
              <p className="text-[13px] font-extrabold text-ink">
                {property.wifi?.network || "Free throughout hostel & rooms"}
              </p>
              <p className="text-[11px] text-mute font-medium mt-0.5">
                Password: <span className="font-mono font-bold text-ink">{property.wifi?.password || "AirPalGuest2026"}</span> (Tap to copy)
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

        {/* Breakfast / Dining Schedule Card */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl bg-[#fff2ee] dark:bg-[#2a130e] p-3.5 ring-1 ring-[#f9d3c7] dark:ring-[#472218]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f03a17]/15 text-[#f03a17]">
              <Coffee size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">Start</p>
              <p className="text-[13px] font-extrabold text-ink">07:30 AM</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-[#fff2ee] dark:bg-[#2a130e] p-3.5 ring-1 ring-[#f9d3c7] dark:ring-[#472218]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f03a17]/15 text-[#f03a17]">
              <Utensils size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">End</p>
              <p className="text-[13px] font-extrabold text-ink">11:00 AM</p>
            </div>
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
                <p className="text-[13px] font-extrabold text-ink">{property.checkIn || "02:30 PM"}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-line" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">Check-Out</p>
              <p className="text-[13px] font-extrabold text-ink">{property.checkOut || "11:00 AM"}</p>
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
                isCheckedIn
                  ? "bg-emerald-600 text-white"
                  : "bg-[#f03a17] text-white hover:bg-[#d83212]"
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

      {/* Main Digital Compendium Accordions (Replaces binders & PDFs) */}
      <div className="mt-6 space-y-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-mute px-1">
          Digital Compendium
        </p>

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
                Welcome to <strong>{propertyName}</strong>! We’re thrilled to have you staying with us. Our team is available 24/7 to ensure your stay is comfortable and seamless.
              </p>
              <div className="mt-2 space-y-1.5 rounded-xl bg-card p-3 ring-1 ring-line">
                <p className="font-bold text-ink">🔑 Key Information:</p>
                <ul className="list-disc list-inside space-y-1 text-mute">
                  <li>Quiet Hours: 10:00 PM – 8:00 AM</li>
                  <li>Non-Smoking Property throughout all rooms and balconies</li>
                  <li>Complimentary Luggage Storage available before check-in and after check-out</li>
                  <li>Questions at 2am? Tap the chat bubble to speak with AirPal AI, your 24/7 AI Receptionist.</li>
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
              <p className="text-xs text-mute font-medium">
                Freshly prepared local dishes delivered directly to your door.
              </p>
              
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
                          onClick={() =>
                            setOrderCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
                          }
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
                    <span className="text-sm font-extrabold text-ink">
                      Total: A${totalOrderPrice.toFixed(2)}
                    </span>
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

        {/* 3. Dining Offers & Drink Specials */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("offers")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🥤</span>
              <span className="text-sm font-extrabold">Dining Offers</span>
            </span>
            {openAccordions.offers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.offers && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2.5 text-xs">
              <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                <p className="font-extrabold text-ink">🍹 Daily Sunset Happy Hour (5:00 PM – 7:00 PM)</p>
                <p className="text-mute mt-0.5">2-for-1 Spritz, craft beers on tap, and complimentary house olives at the rooftop lounge.</p>
              </div>
              <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                <p className="font-extrabold text-ink">🥐 Breakfast Buffet Deal</p>
                <p className="text-mute mt-0.5">Show your room key at the lobby bistro to receive 20% off the hot breakfast buffet.</p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Entertain Your Palate */}
        <div className="rounded-2xl bg-card ring-1 ring-line shadow-xs overflow-hidden transition">
          <button
            type="button"
            onClick={() => toggleAccordion("palate")}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-ink hover:bg-paper transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">🍴</span>
              <span className="text-sm font-extrabold">Entertain your palate</span>
            </span>
            {openAccordions.palate ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.palate && (
            <div className="p-4 pt-1 border-t border-line/60 bg-paper/30 space-y-2.5 text-xs">
              <p className="text-mute font-medium">Curated local favorites hand-picked by our concierge team:</p>
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-ink">Darling Harbour Seafood Grill</p>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">3 min walk</span>
                  </div>
                  <p className="text-mute mt-0.5">Fresh Sydney rock oysters, wood-fired barramundi, and harbour views.</p>
                </div>
                <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-ink">The Little Artisan Bakery &amp; Espresso</p>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">5 min walk</span>
                  </div>
                  <p className="text-mute mt-0.5">Specialty flat whites, fresh almond croissants, and sourdough toasties.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Wi-Fi Details */}
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
                  <p className="font-bold text-ink">{property.wifi?.network || "AirPal_Guest_HighSpeed"}</p>
                  <p className="text-[10px] font-black uppercase text-mute mt-2">Password</p>
                  <p className="font-mono font-extrabold text-ink">{property.wifi?.password || "AirPalGuest2026"}</p>
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

        {/* 6. Phone Directory */}
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
                <a
                  href={property.phone ? `tel:${property.phone}` : "tel:000"}
                  className="rounded-xl bg-card p-3 ring-1 ring-line block hover:bg-paper"
                >
                  <p className="font-bold text-ink">Front Desk / Concierge</p>
                  <p className="text-brand font-extrabold mt-1">Dial 9 or {property.phone || "000"}</p>
                </a>
                <a
                  href="tel:000"
                  className="rounded-xl bg-card p-3 ring-1 ring-line block hover:bg-paper"
                >
                  <p className="font-bold text-ink">Emergency (AU)</p>
                  <p className="text-red-500 font-extrabold mt-1">Dial 000 / 112</p>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 7. Housekeeping Service */}
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

        {/* 8. Hotel Facilities */}
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
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <p className="font-bold text-ink">🏊 Heated Swimming Pool &amp; Spa</p>
                  <p className="text-mute mt-0.5">Level 5 · Open 6:00 AM – 10:00 PM daily. Towels provided poolside.</p>
                </div>
                <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <p className="font-bold text-ink">🏋️ Fitness Centre &amp; Gym</p>
                  <p className="text-mute mt-0.5">Level 5 · 24/7 Access with your room key. Cardio machines &amp; free weights.</p>
                </div>
                <div className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <p className="font-bold text-ink">🧺 Guest Laundry</p>
                  <p className="text-mute mt-0.5">Level 2 · Coin &amp; contactless card operated washers and dryers.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating AirPal AI Receptionist */}
      <AirPalAiReceptionist />

      {/* Door Code Modal */}
      {showDoorCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-[28px] bg-card p-6 ring-1 ring-line shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <KeyRound size={28} />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-ink">Digital Key &amp; Door Code</h3>
              <p className="text-xs text-mute mt-1">
                {roomLabel ? `Room ${roomLabel}` : "Main Entrance & Guest Access"}
              </p>
            </div>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">Keypad PIN Code</p>
              <p className="font-mono text-3xl font-black tracking-widest text-brand mt-1">#4829*</p>
              <p className="text-[11px] text-mute mt-2">Enter code on the door keypad followed by the # symbol.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDoorCodeModal(false)}
              className="w-full rounded-full bg-brand py-3 text-sm font-black text-white shadow-md active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Free Drink Voucher Modal */}
      {showDrinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-[28px] bg-card p-6 ring-1 ring-line shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500">
              <Wine size={28} />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-ink">Welcome Drink Voucher</h3>
              <p className="text-xs text-mute mt-1">Complimentary beverage on us at the Lobby Bar!</p>
            </div>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line border-2 border-dashed border-amber-400/60">
              <p className="text-[10px] font-black uppercase tracking-wider text-mute">Voucher Code</p>
              <p className="font-mono text-2xl font-black tracking-wider text-amber-600 mt-1">AIRPAL-WELCOME</p>
              <p className="text-[11px] text-mute mt-2">
                Show this digital voucher to the bartender for 1x House Wine, Beer, Spritz or Barista Coffee.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDrinkClaimed(true);
                setShowDrinkModal(false);
                toast.success("Voucher ready! Show this at the bar.");
              }}
              className="w-full rounded-full bg-brand py-3 text-sm font-black text-white shadow-md active:scale-95"
            >
              {drinkClaimed ? "Close" : "Redeem at Bar"}
            </button>
          </div>
        </div>
      )}

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
                    {property.checkIn || "02:30 PM"}
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
                  description: `Digital Key active. PIN #4829* for Room ${roomLabel || "Guest"}.`,
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

            {/* Folio Billing Summary */}
            <div className="rounded-2xl bg-paper p-3.5 ring-1 ring-line space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-ink">
                <span className="flex items-center gap-1.5">
                  <Receipt size={14} className="text-brand" />
                  <span>Stay Folio Balance</span>
                </span>
                <span className="text-brand font-black">A$0.00 (Settled)</span>
              </div>
              <p className="text-[11px] text-mute leading-snug">
                All room charges &amp; incidentals have been finalized to your card on file.
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
              🔑 Please leave room keycards on the nightstand or drop in the lobby express box.
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
    </div>
  );
}

function getFallbackMenu(): MenuItem[] {
  return [
    {
      id: "menu-1",
      name: "Club Sandwich & Fries",
      description: "Smoked turkey, crispy bacon, aged cheddar, lettuce, tomato & aioli.",
      price: 24,
      category: "Mains",
      available: true,
    },
    {
      id: "menu-2",
      name: "Artisan Margherita Pizza",
      description: "San Marzano tomato, buffalo mozzarella, fresh basil & extra virgin olive oil.",
      price: 26,
      category: "Mains",
      available: true,
    },
    {
      id: "menu-3",
      name: "Sydney Rock Oysters (6pcs)",
      description: "Freshly shucked with mignonette dressing & lemon wedges.",
      price: 28,
      category: "Starters",
      available: true,
    },
    {
      id: "menu-4",
      name: "Truffle Parmesan Fries",
      description: "Crispy shoestring fries tossed in white truffle oil & parmesan.",
      price: 14,
      category: "Starters",
      available: true,
    },
    {
      id: "menu-5",
      name: "Aperol Spritz",
      description: "Aperol, prosecco, splash of soda, fresh orange slice.",
      price: 18,
      category: "Drinks",
      available: true,
    },
    {
      id: "menu-6",
      name: "Australian Craft Beer (Pint)",
      description: "Local pale ale brewed in Sydney.",
      price: 12,
      category: "Drinks",
      available: true,
    },
  ];
}
