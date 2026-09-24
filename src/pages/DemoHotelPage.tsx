import { useEffect } from "react";
import { useStay } from "@/contexts/StayContext";
import { noteQrContext } from "@/lib/analytics";
import { saveCachedProperty } from "@/lib/properties";
import {
  DEMO_HOTEL_PROPERTY_ID,
  DEMO_HOTEL_ROOM_TOKEN,
  harbourStaySeeds,
} from "@/lib/seed-stay";
import { ConciergePage } from "./ConciergePage";

/**
 * Shareable showcase at /DemoHotel — same post-scan Concierge UI as a Stay room QR
 * (`/g/harbour-hotel?r=tok-101-demo`). Seeds the Harbour demo locally and keeps the
 * URL as /DemoHotel so demos can share that link (no redirect).
 */
export function DemoHotelPage() {
  const { setSession } = useStay();

  useEffect(() => {
    const seed = harbourStaySeeds()[0];
    if (seed?.property) saveCachedProperty(seed.property);
    setSession({
      kind: "stay",
      propertyId: DEMO_HOTEL_PROPERTY_ID,
      roomToken: DEMO_HOTEL_ROOM_TOKEN,
    });
    noteQrContext(`stay:${DEMO_HOTEL_PROPERTY_ID}`, {
      propertyId: DEMO_HOTEL_PROPERTY_ID,
      source: "demo-hotel",
    });
  }, [setSession]);

  return <ConciergePage />;
}
