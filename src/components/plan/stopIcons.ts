import {
  Bed,
  Cake,
  Camera,
  Coffee,
  Footprints,
  Fuel,
  Gift,
  HeartHandshake,
  Home,
  MapPin,
  Mic,
  Music,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { StopIconType } from "@shared/plan";

export interface StopIconDef {
  id: StopIconType;
  label: string;
  emoji: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  ringClass: string;
}

export interface StopIconCategory {
  name: string;
  emoji: string;
  iconIds: StopIconType[];
}

export const STOP_ICON_CATEGORIES: StopIconCategory[] = [
  {
    name: "Milestones",
    emoji: "💍",
    iconIds: ["ceremony", "speech", "gift", "photo"],
  },
  {
    name: "Dining & Drinks",
    emoji: "🥂",
    iconIds: ["food", "drinks", "coffee", "cake", "toast"],
  },
  {
    name: "Activities & Vibes",
    emoji: "🎵",
    iconIds: ["music", "sight", "walk"],
  },
  {
    name: "Places & Logistics",
    emoji: "📍",
    iconIds: ["pin", "home", "stay", "shop", "petrol"],
  },
];

export const POPULAR_STOP_ICONS: StopIconType[] = ["food", "drinks", "coffee", "toast", "cake", "music", "pin"];

export const STOP_ICON_OPTIONS: StopIconDef[] = [
  {
    id: "ceremony",
    label: "Ceremony & Service",
    emoji: "💍",
    icon: HeartHandshake,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    ringClass: "ring-amber-500/20",
  },
  {
    id: "cake",
    label: "Cake & Dessert",
    emoji: "🎂",
    icon: Cake,
    colorClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-500/10",
    ringClass: "ring-pink-500/20",
  },
  {
    id: "toast",
    label: "Toast & Welcome",
    emoji: "🥂",
    icon: Sparkles,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
    ringClass: "ring-yellow-500/20",
  },
  {
    id: "food",
    label: "Food & Dining",
    emoji: "🍕",
    icon: Utensils,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    ringClass: "ring-orange-500/20",
  },
  {
    id: "drinks",
    label: "Drinks & Bar",
    emoji: "🍸",
    icon: Wine,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    ringClass: "ring-purple-500/20",
  },
  {
    id: "coffee",
    label: "Coffee & Brunch",
    emoji: "☕",
    icon: Coffee,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    ringClass: "ring-amber-500/20",
  },
  {
    id: "gift",
    label: "Gifts & Favours",
    emoji: "🎁",
    icon: Gift,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    ringClass: "ring-emerald-500/20",
  },
  {
    id: "speech",
    label: "Speeches & Tributes",
    emoji: "🎤",
    icon: Mic,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-500/10",
    ringClass: "ring-indigo-500/20",
  },
  {
    id: "home",
    label: "House Tour",
    emoji: "🏡",
    icon: Home,
    colorClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-500/10",
    ringClass: "ring-teal-500/20",
  },
  {
    id: "photo",
    label: "Photos & Portraits",
    emoji: "📸",
    icon: Camera,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-500/10",
    ringClass: "ring-sky-500/20",
  },
  {
    id: "music",
    label: "Music & Dancing",
    emoji: "🎵",
    icon: Music,
    colorClass: "text-fuchsia-600 dark:text-fuchsia-400",
    bgClass: "bg-fuchsia-500/10",
    ringClass: "ring-fuchsia-500/20",
  },
  {
    id: "sight",
    label: "Scenic Sight",
    emoji: "🏞️",
    icon: Camera,
    colorClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-500/10",
    ringClass: "ring-teal-500/20",
  },
  {
    id: "petrol",
    label: "Petrol / Pitstop",
    emoji: "⛽",
    icon: Fuel,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    ringClass: "ring-blue-500/20",
  },
  {
    id: "stay",
    label: "Stay / Cabin",
    emoji: "🏕️",
    icon: Bed,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    ringClass: "ring-emerald-500/20",
  },
  {
    id: "shop",
    label: "Market / Shop",
    emoji: "🛍️",
    icon: ShoppingBag,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
    ringClass: "ring-rose-500/20",
  },
  {
    id: "walk",
    label: "Walk / Stroll",
    emoji: "🚶",
    icon: Footprints,
    colorClass: "text-lime-600 dark:text-lime-400",
    bgClass: "bg-lime-500/10",
    ringClass: "ring-lime-500/20",
  },
  {
    id: "pin",
    label: "Meeting Point",
    emoji: "📍",
    icon: MapPin,
    colorClass: "text-zinc-600 dark:text-zinc-400",
    bgClass: "bg-zinc-500/10",
    ringClass: "ring-zinc-500/20",
  },
];

export function getStopIconDef(id?: string): StopIconDef {
  const found = STOP_ICON_OPTIONS.find((opt) => opt.id === id);
  return found || STOP_ICON_OPTIONS[STOP_ICON_OPTIONS.length - 1]!; // fallback to pin
}
