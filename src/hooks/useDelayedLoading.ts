import { useEffect, useState } from "react";

/**
 * Show a loading skeleton only if loading persists past `delayMs`.
 * Fast-resolving local data renders content directly — no skeleton flash,
 * no layout shift from skeleton↔content swaps. Slow loads still get feedback.
 */
export function useDelayedLoading(loading: boolean, delayMs = 350): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [loading, delayMs]);
  return loading && show;
}
