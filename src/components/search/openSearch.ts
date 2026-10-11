/** Tiny opener for the global search modal. Lives apart from the modal so pages
 * can trigger search without eagerly bundling the 800-line modal + catalog. */

export type SearchCategory = "all" | "people" | "places" | "events" | "circle" | "stay" | "plan";

export interface OpenGlobalSearchOptions {
  query?: string;
  category?: SearchCategory;
}

export const OPEN_SEARCH_EVENT = "airpal-open-search";
/** Dispatched by the modal once mounted so the shell can flush a queued open. */
export const SEARCH_READY_EVENT = "airpal-search-ready";

export function openGlobalSearch(opts?: OpenGlobalSearchOptions | unknown): void {
  const detail =
    opts && typeof opts === "object" && ("query" in opts || "category" in opts)
      ? (opts as OpenGlobalSearchOptions)
      : undefined;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail }));
}
