import { useEffect } from "react";

function tag(el: Element | null): string {
  if (!el) return "none";
  const parts = [el.tagName.toLowerCase()];
  if (el.id) parts.push(`#${el.id}`);
  const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "";
  if (cls) parts.push(`.${cls}`);
  return parts.join("");
}

/**
 * Temporary scroll diagnostic. Active only with ?scrolldebug in the URL:
 * reports whether the layout is scrollable and whether wheel/touch gestures
 * reach the page (and if something calls preventDefault on them).
 */
export function ScrollProbe() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let params: URLSearchParams | null = null;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    if (!params.has("scrolldebug")) return;

    const se = document.scrollingElement;
    console.log("[scrolldebug] layout", {
      scrollHeight: se?.scrollHeight,
      innerHeight: window.innerHeight,
      scrollable: (se?.scrollHeight || 0) - window.innerHeight,
      bodyOverflow: document.body.style.overflow,
      computedBodyOverflowY: getComputedStyle(document.body).overflowY,
      computedHtmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      url: window.location.pathname,
    });

    let count = 0;
    const onWheel = (e: WheelEvent) => {
      if (count >= 5) return;
      count += 1;
      console.log("[scrolldebug] wheel", {
        n: count,
        deltaX: Math.round(e.deltaX * 10) / 10,
        deltaY: Math.round(e.deltaY * 10) / 10,
        deltaMode: e.deltaMode,
        defaultPrevented: e.defaultPrevented,
        target: tag(e.target as Element | null),
      });
    };
    const onTouch = () => {
      console.log(
        "[scrolldebug] touchmove reached page, target:",
        tag(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)),
      );
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouch, { capture: true, passive: true, once: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", onTouch, { capture: true });
    };
  }, []);

  return null;
}
