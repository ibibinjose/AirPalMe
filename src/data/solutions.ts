import { BRAND_TAGLINE } from "@/lib/brand";

export { BRAND_TAGLINE };

export type SolutionId = "stay" | "street" | "campus" | "host" | "event";

export interface Solution {
  id: SolutionId;
  title: string;
  line: string;
  action: string;
  href: string;
  image: string;
  steps: string[];
}

export const SOLUTIONS: Solution[] = [
  {
    id: "stay",
    title: "Stay",
    line: "Room QR. Wi-Fi. Help.",
    action: "Open stay",
    href: "/DemoHotel",
    image: "/media/room.jpg",
    steps: ["Print a room card", "Guest scans", "Wi-Fi, dining, staff"],
  },
  {
    id: "street",
    title: "Street",
    line: "What’s around this marker.",
    action: "Open nearby",
    href: "/q/syd-rocks-argyle",
    image: "/media/harbour.jpg",
    steps: ["Poster or lobby code", "Guest scans", "Eat, walks, tonight — not rivals"],
  },
  {
    id: "campus",
    title: "Campus",
    line: "Gate QR. Hall. Help.",
    action: "Open campus",
    href: "/c/harbour-college",
    image: "/media/campus.jpg",
    steps: ["College gate code", "Resident scans", "Today, dining, staff"],
  },
  {
    id: "host",
    title: "Host",
    line: "One workspace. Print. Run.",
    action: "Open host",
    href: "/start",
    image: "/media/laneway.jpg",
    steps: ["Create a place", "Set Wi-Fi", "Print the kit"],
  },
  {
    id: "event",
    title: "Event",
    line: "Gate QR. Stall list. Saves.",
    action: "Open market",
    href: "/e/evt-rocks-market",
    image: "/media/walk.jpg",
    steps: ["Create the event", "Import stalls", "Print the gate"],
  },
];

export function getSolution(id: string) {
  return SOLUTIONS.find((s) => s.id === id);
}
