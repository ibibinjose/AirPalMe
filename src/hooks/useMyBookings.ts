import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { useLocalNow } from "@/hooks/useLocalNow";
import type { Booking } from "@shared/booking";

export type BookingWithId = Booking & { id: string };

const CACHE_PREFIX = "airpal.wallet.bookings.";

export function readCachedBookings(uid: string): BookingWithId[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BookingWithId[]) : [];
  } catch {
    return [];
  }
}

export function writeCachedBookings(uid: string, list: BookingWithId[]) {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(list));
  } catch {
    /* ignore storage quota exceptions */
  }
}

/**
 * Checks whether a booking is considered upcoming.
 * True if not explicitly expired by date and not cancelled or refunded.
 */
export function isUpcomingBooking(booking: Booking, today: string): boolean {
  if (booking.status === "cancelled" || booking.status === "refunded") {
    return false;
  }
  if (!booking.date) return true;
  return booking.date >= today;
}

export function useMyBookings() {
  const { user } = useAuth();
  const { today } = useLocalNow();

  const [bookings, setBookings] = useState<BookingWithId[] | undefined>(() => {
    if (!user?.uid) return undefined;
    const cached = readCachedBookings(user.uid);
    return cached.length > 0 ? cached : undefined;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!user?.uid) return false;
    return readCachedBookings(user.uid).length === 0;
  });
  const [failed, setFailed] = useState<boolean>(false);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [attempt, setAttempt] = useState<number>(0);

  const refresh = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setBookings([]);
      setLoading(false);
      setFailed(false);
      setIsOfflineCached(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      const cached = readCachedBookings(uid);
      setBookings(cached);
      setLoading(false);
      setIsOfflineCached(cached.length > 0);
      return;
    }

    let cancelled = false;
    setLoading(bookings === undefined);
    setFailed(false);

    // Try primary query with orderBy createdAt desc. Fallback to unindexed where query if needed.
    const runQuery = async () => {
      try {
        const bookingsCol = collection(db, "bookings");
        let snap;
        try {
          const qPrimary = query(bookingsCol, where("customerUid", "==", uid), orderBy("createdAt", "desc"));
          snap = await getDocs(qPrimary);
        } catch {
          // Fallback if composite index on (customerUid, createdAt) is pending
          const qFallback = query(bookingsCol, where("customerUid", "==", uid));
          snap = await getDocs(qFallback);
        }

        if (cancelled) return;

        const docs: BookingWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Booking, "id">),
        }));

        // Sort client-side by date / createdAt desc if needed
        docs.sort((a, b) => {
          const aTime = a.createdAt || a.date || "";
          const bTime = b.createdAt || b.date || "";
          return bTime.localeCompare(aTime);
        });

        writeCachedBookings(uid, docs);
        setBookings(docs);
        setIsOfflineCached(false);
        setLoading(false);
      } catch (_err) {
        if (cancelled) return;
        const cached = readCachedBookings(uid);
        if (cached.length > 0) {
          setBookings(cached);
          setIsOfflineCached(true);
        } else {
          setFailed(true);
        }
        setLoading(false);
      }
    };

    void runQuery();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, attempt]);

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => isUpcomingBooking(b, today));
  }, [bookings, today]);

  const pastBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => !isUpcomingBooking(b, today));
  }, [bookings, today]);

  return {
    bookings: bookings ?? [],
    upcomingBookings,
    pastBookings,
    loading: loading && bookings === undefined,
    failed,
    isOfflineCached,
    refresh,
  };
}
