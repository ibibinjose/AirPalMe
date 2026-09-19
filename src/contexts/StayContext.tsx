import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMarker } from "@/lib/catalog";
import type { MarkerDoc } from "@shared/nearby";
import type { PropertyInfo } from "@shared/airpal-data";
import { useAuth } from "./AuthContext";
import {
  fetchProperty,
  getCachedProperty,
  saveCachedProperty,
  subscribeProperty,
  unknownProperty,
} from "@/lib/properties";
import { fetchMarker } from "@/lib/markers-store";

export type StayKind = "none" | "stay" | "marker" | "campus";

export type StaySession = {
  kind: StayKind;
  propertyId?: string;
  room?: string;
  roomToken?: string;
  markerId?: string;
  campusId?: string;
  /** ISO datetime for the booked check-in. */
  checkInAt?: string;
};

const KEY = "airpal.stay";

function readSession(): StaySession {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StaySession;
  } catch {
    /* ignore */
  }
  return { kind: "none" };
}

type StayContextValue = {
  session: StaySession;
  setSession: (next: StaySession) => void;
  property: PropertyInfo;
  marker: MarkerDoc | undefined;
  roomLabel: string | null;
  loadingProperty: boolean;
  updateProperty: (next: PropertyInfo) => void;
  reloadProperty: () => Promise<void>;
};

const StayContext = createContext<StayContextValue | undefined>(undefined);

export function StayProvider({ children }: { children: React.ReactNode }) {
  const { user, isHost } = useAuth();
  const [session, setSessionState] = useState<StaySession>({ kind: "none" });

  useEffect(() => {
    setSessionState(readSession());
  }, []);

  const hostPropertyId = user?.propertyIds?.[0];
  const activePropertyId = session.propertyId || (isHost && hostPropertyId ? hostPropertyId : undefined);

  const [property, setPropertyState] = useState<PropertyInfo>(
    () => (activePropertyId && getCachedProperty(activePropertyId)) || unknownProperty(activePropertyId || "unknown"),
  );
  const [loadingProperty, setLoadingProperty] = useState(false);

  useEffect(() => {
    if (!activePropertyId) {
      setPropertyState(unknownProperty("unknown"));
      setLoadingProperty(false);
      return;
    }
    setLoadingProperty(true);
    const unsub = subscribeProperty(activePropertyId, (prop) => {
      setPropertyState(prop);
      setLoadingProperty(false);
    });
    return unsub;
  }, [activePropertyId]);

  const updateProperty = useCallback((next: PropertyInfo) => {
    saveCachedProperty(next);
    setPropertyState(next);
  }, []);

  const reloadProperty = useCallback(async () => {
    if (!activePropertyId) return;
    setLoadingProperty(true);
    const prop = await fetchProperty(activePropertyId);
    setPropertyState(prop);
    setLoadingProperty(false);
  }, [activePropertyId]);

  const setSession = useCallback((next: StaySession) => {
    setSessionState((prev) => {
      const merged = { ...prev, ...next };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, []);

  const roomLabel = useMemo(() => {
    if (session.room) return session.room;
    if (session.roomToken && property.roomTokens) {
      return property.roomTokens[session.roomToken] || null;
    }
    return null;
  }, [session.room, session.roomToken, property.roomTokens]);

  const [markerVersion, setMarkerVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    const ids = [session.markerId, property.lobbyMarkerId].filter(Boolean) as string[];
    if (!ids.length) return;
    void Promise.all(ids.map((id) => fetchMarker(id))).then(() => {
      if (alive) setMarkerVersion((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [session.markerId, property.lobbyMarkerId]);

  const marker = useMemo(() => {
    void markerVersion;
    if (session.markerId) return getMarker(session.markerId);
    if (property.lobbyMarkerId) return getMarker(property.lobbyMarkerId);
    return undefined;
  }, [session.markerId, property.lobbyMarkerId, markerVersion]);

  const value = useMemo<StayContextValue>(() => {
    return {
      session,
      setSession,
      property,
      marker,
      roomLabel,
      loadingProperty,
      updateProperty,
      reloadProperty,
    };
  }, [session, setSession, property, marker, roomLabel, loadingProperty, updateProperty, reloadProperty]);

  return <StayContext.Provider value={value}>{children}</StayContext.Provider>;
}

export function useStay() {
  const ctx = useContext(StayContext);
  if (!ctx) throw new Error("useStay");
  return ctx;
}
