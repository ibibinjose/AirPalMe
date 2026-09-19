import { useCallback, useEffect, useRef } from "react";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useEvents } from "@/contexts/EventsContext";
import { useStay } from "@/contexts/StayContext";
import { fetchPlaces } from "@/lib/places-store";
import { fetchProperty } from "@/lib/properties";

export const RELOAD_DATA_EVENT = "airpal:reload-data";

/**
 * Hook for components/pages to register a callback that runs whenever
 * the user triggers a manual reload (e.g. via pull-to-refresh).
 */
export function useOnDataReload(callback: () => void | Promise<void>) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleEvent = () => {
      void savedCallback.current();
    };
    window.addEventListener(RELOAD_DATA_EVENT, handleEvent);
    return () => {
      window.removeEventListener(RELOAD_DATA_EVENT, handleEvent);
    };
  }, []);
}

/**
 * Top-level data reload orchestrator. Refreshes clock, weather,
 * events, place catalog, property info, and triggers page listeners.
 */
export function useDataReload() {
  const { refresh: refreshLocalNow } = useLocalNow();
  const { refresh: refreshEvents } = useEvents();
  const { session } = useStay();

  const reloadAllData = useCallback(async () => {
    const startTime = Date.now();

    try {
      const tasks: Promise<unknown>[] = [
        // 1. Refetch weather and recalculate local now / anchor
        Promise.resolve(refreshLocalNow?.()),
        // 2. Reload cached/saved events, stalls, and calendar states
        Promise.resolve(refreshEvents?.()),
        // 3. Refetch active precinct places from Firestore
        fetchPlaces(),
      ];

      // 4. Refetch property profile if in an active guest stay
      if (session?.propertyId) {
        tasks.push(fetchProperty(session.propertyId));
      }

      // 5. Fire window event so active pages re-evaluate or refetch
      window.dispatchEvent(new CustomEvent(RELOAD_DATA_EVENT, { detail: { timestamp: Date.now() } }));

      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn("Data reload encountered an issue:", err);
    } finally {
      // Ensure minimum visual feedback duration so animation is clear
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }
    }
  }, [refreshLocalNow, refreshEvents, session?.propertyId]);

  return { reloadAllData };
}
