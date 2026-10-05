/** Run `cb` when the browser is idle (first paint first). Falls back to a
 * macrotask where `requestIdleCallback` is missing. Returns a cancel fn. */
export function onIdle(cb: () => void): () => void {
  if (typeof window === "undefined") {
    cb();
    return () => undefined;
  }
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(() => cb(), { timeout: 2500 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(cb, 1);
  return () => window.clearTimeout(timer);
}
