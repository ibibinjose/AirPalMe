import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query as fsQuery,
  orderBy,
  limit as fsLimit,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalNow } from "@/hooks/useLocalNow";

export interface SearchLogPayload {
  query: string;
  category?: string;
  city?: string;
  resultsCount?: number;
  source?: string;
  selectedResultId?: string;
  selectedResultTitle?: string;
  selectedResultCategory?: string;
}

export interface PopularSearchTerm {
  id: string;
  term: string;
  count: number;
  category?: string;
  city?: string;
  lastSearchedAt?: string;
}

/** Normalizes search query into a consistent key for grouping (e.g. " Bondi Beach! " -> "bondi-beach", "Café" -> "cafe") */
export function normalizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const DEFAULT_DEBOUNCE_MS = 1000;

export interface UseSearchQueryLoggerOptions {
  source?: string;
  defaultCategory?: string;
  debounceMs?: number;
}

export function useSearchQueryLogger(options: UseSearchQueryLoggerOptions = {}) {
  const { source = "search", defaultCategory = "all", debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const { user } = useAuth();
  const { city } = useLocalNow();

  const lastLoggedQueryRef = useRef<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Directly log a search query to Firestore.
   * Updates both the granular `search_queries` audit log and the aggregated `popular_searches` collection.
   */
  const logSearch = useCallback(
    async (payloadOrQuery: SearchLogPayload | string) => {
      const payload: SearchLogPayload =
        typeof payloadOrQuery === "string" ? { query: payloadOrQuery } : payloadOrQuery;

      const trimmed = (payload.query || "").trim();
      // Ignore queries with less than 2 characters
      if (trimmed.length < 2) return;

      const normalized = normalizeSearchTerm(trimmed);
      if (!normalized) return;

      const currentCity = payload.city || city || "Sydney";
      const currentCategory = payload.category || defaultCategory;
      const currentSource = payload.source || source;
      const currentResultsCount = typeof payload.resultsCount === "number" ? payload.resultsCount : undefined;

      lastLoggedQueryRef.current = normalized;

      const db = getFirebaseDb();
      if (!db) return;

      try {
        const timestamp = new Date().toISOString();

        // 1. Detailed log entry in `search_queries`
        const queryData: Record<string, unknown> = {
          query: trimmed,
          normalized,
          city: currentCity,
          category: currentCategory,
          source: currentSource,
          resultsCount: currentResultsCount ?? 0,
          userId: user?.uid || null,
          isGuest: !user?.uid,
          createdAt: serverTimestamp(),
          clientTimestamp: timestamp,
        };

        if (payload.selectedResultId) {
          queryData.selectedResultId = payload.selectedResultId;
          queryData.selectedResultTitle = payload.selectedResultTitle || "";
          queryData.selectedResultCategory = payload.selectedResultCategory || "";
        }

        // Add to search_queries collection asynchronously (fire-and-forget, non-blocking)
        void addDoc(collection(db, "search_queries"), queryData).catch(() => undefined);

        // 2. Increment aggregated term in `popular_searches`
        const popularDocRef = doc(db, "popular_searches", normalized);
        void setDoc(
          popularDocRef,
          {
            term: trimmed,
            normalized,
            count: increment(1),
            category: currentCategory,
            city: currentCity,
            lastSearchedAt: timestamp,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch(() => undefined);
      } catch {
        // Silently swallow errors to guarantee search UX is never blocked
      }
    },
    [user, city, source, defaultCategory],
  );

  /**
   * Debounced track helper for typing in inputs:
   * Waits for user to pause typing before sending query log.
   */
  const trackQuery = useCallback(
    (query: string, resultsCount?: number, category?: string) => {
      const trimmed = (query || "").trim();
      if (trimmed.length < 2) return;

      const normalized = normalizeSearchTerm(trimmed);
      if (normalized === lastLoggedQueryRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void logSearch({
          query: trimmed,
          resultsCount,
          category: category || defaultCategory,
          source,
        });
      }, debounceMs);
    },
    [logSearch, defaultCategory, source, debounceMs],
  );

  /**
   * Log click on a specific search result to measure relevance and conversions.
   */
  const logResultClick = useCallback(
    (
      query: string,
      result: { id: string; title: string; category?: string; href?: string },
    ) => {
      const trimmed = (query || "").trim();
      if (!trimmed) return;

      void logSearch({
        query: trimmed,
        selectedResultId: result.id,
        selectedResultTitle: result.title,
        selectedResultCategory: result.category,
        source: `${source}_click`,
      });
    },
    [logSearch, source],
  );

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    logSearch,
    trackQuery,
    logResultClick,
  };
}

/**
 * Hook to retrieve popular search terms from Firestore,
 * allowing UI components to suggest trending or high-relevance terms to users.
 */
export function usePopularSearches(options: { limit?: number; fallbackDefaults?: string[] } = {}) {
  const {
    limit = 6,
    fallbackDefaults = ["Surry Hills", "Bondi Beach", "Coffee", "Nightlife", "Harbour Cruise", "Live Music"],
  } = options;

  const [popularTerms, setPopularTerms] = useState<PopularSearchTerm[]>(() =>
    fallbackDefaults.map((term, i) => ({
      id: `default-${i}`,
      term,
      count: 20 - i,
      category: "all",
    })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const db = getFirebaseDb();

    if (!db) {
      setPopularTerms(
        fallbackDefaults.map((term, i) => ({
          id: `fallback-${i}`,
          term,
          count: 10 - i,
          category: "all",
        })),
      );
      setLoading(false);
      return;
    }

    const q = fsQuery(
      collection(db, "popular_searches"),
      orderBy("count", "desc"),
      fsLimit(limit),
    );

    getDocs(q)
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot.empty) {
          const list: PopularSearchTerm[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              term: data.term || docSnap.id,
              count: typeof data.count === "number" ? data.count : 1,
              category: data.category,
              city: data.city,
              lastSearchedAt: data.lastSearchedAt,
            };
          });
          setPopularTerms(list);
        } else {
          // If Firestore collection has not accumulated enough terms yet, provide initial curated terms
          setPopularTerms(
            fallbackDefaults.map((term, i) => ({
              id: `default-${i}`,
              term,
              count: 10 - i,
              category: "all",
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPopularTerms(
            fallbackDefaults.map((term, i) => ({
              id: `default-${i}`,
              term,
              count: 10 - i,
              category: "all",
            })),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit, fallbackDefaults]);

  return { popularTerms, loading };
}

export interface AutocompleteSuggestion {
  id: string;
  term: string;
  count: number;
  category?: string;
  city?: string;
  matchType: "prefix" | "substring" | "trending";
}

export interface UseSearchAutocompleteOptions {
  limit?: number;
  category?: string;
  city?: string;
  fallbackDefaults?: string[];
}

/**
 * Autocomplete hook that provides real-time search term suggestions as the user types,
 * ranked by prefix matches, substring matches, and historical search volume from Firestore.
 */
export function useSearchAutocomplete(
  query: string,
  options: UseSearchAutocompleteOptions = {},
) {
  const {
    limit = 6,
    category,
    fallbackDefaults = [
      "Surry Hills",
      "Bondi Beach",
      "Live Music Tonight",
      "Morning Running Mate",
      "Harbour View Hotel",
      "Coffee & Walk",
      "Botanic Gardens",
      "Contemporary Art Gallery",
    ],
  } = options;

  const { popularTerms, loading } = usePopularSearches({
    limit: 35,
    fallbackDefaults,
  });

  const suggestions = useMemo<AutocompleteSuggestion[]>(() => {
    const trimmed = (query || "").trim().toLowerCase();

    // Filter by vertical category if specified
    let pool = popularTerms;
    if (category && category !== "all") {
      pool = pool.filter((p) => !p.category || p.category === category || p.category === "all");
    }

    if (!trimmed) {
      // Empty input query: return top trending terms
      return pool.slice(0, limit).map((p) => ({
        id: p.id,
        term: p.term,
        count: p.count,
        category: p.category,
        city: p.city,
        matchType: "trending",
      }));
    }

    // Matching query: rank prefix matches first, then substring matches
    const prefixMatches: AutocompleteSuggestion[] = [];
    const substringMatches: AutocompleteSuggestion[] = [];

    for (const item of pool) {
      const lowerTerm = item.term.toLowerCase();
      if (lowerTerm.startsWith(trimmed)) {
        prefixMatches.push({
          id: item.id,
          term: item.term,
          count: item.count,
          category: item.category,
          city: item.city,
          matchType: "prefix",
        });
      } else if (lowerTerm.includes(trimmed)) {
        substringMatches.push({
          id: item.id,
          term: item.term,
          count: item.count,
          category: item.category,
          city: item.city,
          matchType: "substring",
        });
      }
    }

    // Sort by search volume count descending
    prefixMatches.sort((a, b) => b.count - a.count);
    substringMatches.sort((a, b) => b.count - a.count);

    return [...prefixMatches, ...substringMatches].slice(0, limit);
  }, [query, popularTerms, category, limit]);

  return { suggestions, loading };
}

