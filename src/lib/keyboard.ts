import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard, type KeyboardInfo } from "@capacitor/keyboard";

export interface VirtualKeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

let currentState: VirtualKeyboardState = {
  isKeyboardOpen: false,
  keyboardHeight: 0,
};

const listeners = new Set<(state: VirtualKeyboardState) => void>();
let initialized = false;
let cleanupFn: (() => void) | null = null;

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Updates DOM CSS variables, dataset, and classes for the active keyboard state.
 */
function applyKeyboardStateToDom(isOpen: boolean, height: number) {
  if (typeof document === "undefined") return;

  const docEl = document.documentElement;
  const body = document.body;

  currentState = {
    isKeyboardOpen: isOpen,
    keyboardHeight: height,
  };

  if (isOpen) {
    docEl.style.setProperty("--keyboard-height", `${height}px`);
    docEl.classList.add("keyboard-open");
    body?.classList.add("keyboard-open");
    docEl.setAttribute("data-keyboard-open", "true");
  } else {
    docEl.style.setProperty("--keyboard-height", "0px");
    docEl.classList.remove("keyboard-open");
    body?.classList.remove("keyboard-open");
    docEl.setAttribute("data-keyboard-open", "false");
  }

  if (typeof window !== "undefined" && window.visualViewport) {
    docEl.style.setProperty("--visual-viewport-height", `${window.visualViewport.height}px`);
    docEl.style.setProperty("--visual-viewport-offset-top", `${window.visualViewport.offsetTop}px`);
  }

  notifyListeners();
}

const safeRequestAnimationFrame = (cb: FrameRequestCallback) => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(cb);
  }
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16);
};

/**
 * Ensures an interactive element (input, textarea, select, or contenteditable)
 * is smoothly scrolled into the safe visible viewport region without being obscured
 * by top navigation bars or the virtual keyboard.
 */
export function ensureElementInView(
  target: HTMLElement | null | undefined,
  options: {
    block?: ScrollLogicalPosition;
    topClearance?: number;
    bottomClearance?: number;
    behavior?: ScrollBehavior;
  } = {},
): void {
  if (!target || typeof window === "undefined") return;

  const {
    block = "center",
    topClearance = 70, // Keep space for sticky headers / TopNav
    bottomClearance = 24, // Keep space above virtual keyboard
    behavior = "smooth",
  } = options;

  // Use safeRequestAnimationFrame so any layout or viewport resize has commenced
  safeRequestAnimationFrame(() => {
    if (!target.isConnected) return;

    const rect = target.getBoundingClientRect();
    const vHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const vTop = window.visualViewport ? window.visualViewport.offsetTop : 0;

    const safeTop = vTop + topClearance;
    const safeBottom = vTop + vHeight - bottomClearance;

    const isAboveSafeZone = rect.top < safeTop;
    const isBelowSafeZone = rect.bottom > safeBottom;

    if (isAboveSafeZone || isBelowSafeZone) {
      try {
        target.scrollIntoView({
          behavior,
          block,
          inline: "nearest",
        });
      } catch {
        target.scrollIntoView();
      }
    }
  });
}

/**
 * Initializes listeners for mobile virtual keyboard changes.
 * Handles both Capacitor native environments (iOS/Android) and Web (window.visualViewport).
 */
export function initKeyboardManager(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (initialized && cleanupFn) {
    return cleanupFn;
  }

  initialized = true;
  const isNative = Capacitor.isNativePlatform();

  // Set initial viewport height
  if (window.visualViewport) {
    document.documentElement.style.setProperty(
      "--visual-viewport-height",
      `${window.visualViewport.height}px`,
    );
  } else {
    document.documentElement.style.setProperty("--visual-viewport-height", `${window.innerHeight}px`);
  }

  const unsubs: Array<() => void> = [];

  // 1. Native Capacitor Keyboard Plugin Listeners
  if (isNative) {
    let willShowSub: { remove: () => void } | null = null;
    let willHideSub: { remove: () => void } | null = null;

    Keyboard.addListener("keyboardWillShow", (info: KeyboardInfo) => {
      applyKeyboardStateToDom(true, info.keyboardHeight || 300);
      const active = document.activeElement as HTMLElement | null;
      if (active && isEditableElement(active)) {
        setTimeout(() => ensureElementInView(active), 100);
        setTimeout(() => ensureElementInView(active), 300);
      }
    }).then((sub) => {
      willShowSub = sub;
    }).catch(() => {
      /* ignore */
    });

    Keyboard.addListener("keyboardWillHide", () => {
      applyKeyboardStateToDom(false, 0);
    }).then((sub) => {
      willHideSub = sub;
    }).catch(() => {
      /* ignore */
    });

    unsubs.push(() => {
      willShowSub?.remove();
      willHideSub?.remove();
    });
  }

  // 2. Web Visual Viewport Listener (standard on iOS Safari & Android Chrome)
  if (window.visualViewport) {
    const onViewportChange = () => {
      const vport = window.visualViewport;
      if (!vport) return;

      document.documentElement.style.setProperty("--visual-viewport-height", `${vport.height}px`);
      document.documentElement.style.setProperty("--visual-viewport-offset-top", `${vport.offsetTop}px`);

      // If the visual viewport shrank by more than 130px, keyboard is active
      const screenH = window.innerHeight;
      const heightDiff = screenH - vport.height;
      const activeEl = document.activeElement as HTMLElement | null;
      const hasEditableFocus = activeEl && isEditableElement(activeEl);

      const isKbOpen = heightDiff > 130 && Boolean(hasEditableFocus);
      const computedKbHeight = isKbOpen ? Math.round(heightDiff) : 0;

      applyKeyboardStateToDom(isKbOpen, computedKbHeight);

      if (isKbOpen && activeEl) {
        ensureElementInView(activeEl);
      }
    };

    window.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
    window.visualViewport.addEventListener("scroll", onViewportChange, { passive: true });

    unsubs.push(() => {
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    });
  }

  // 3. Focusin / Focusout Listeners to proactively prepare and position elements
  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target || !isEditableElement(target)) return;

    // Small sequential delays to sync with keyboard appearance animation
    safeRequestAnimationFrame(() => ensureElementInView(target));
    setTimeout(() => ensureElementInView(target), 120);
    setTimeout(() => ensureElementInView(target), 320);
  };

  const onFocusOut = () => {
    // If no other editable element took focus, reset after slight delay
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !isEditableElement(active)) {
        if (!isNative) {
          applyKeyboardStateToDom(false, 0);
        }
      }
    }, 150);
  };

  window.addEventListener("focusin", onFocusIn, { passive: true });
  window.addEventListener("focusout", onFocusOut, { passive: true });

  unsubs.push(() => {
    window.removeEventListener("focusin", onFocusIn);
    window.removeEventListener("focusout", onFocusOut);
  });

  cleanupFn = () => {
    unsubs.forEach((u) => u());
    applyKeyboardStateToDom(false, 0);
    initialized = false;
    cleanupFn = null;
  };

  return cleanupFn;
}

/**
 * Checks if an element is an interactive text input or editable surface.
 */
function isEditableElement(el: HTMLElement): boolean {
  const tagName = el.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") return true;
  if (tagName === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase() || "text";
    return !["checkbox", "radio", "range", "hidden", "button", "submit", "reset", "file"].includes(type);
  }
  return el.isContentEditable;
}

/**
 * React hook to observe virtual keyboard visibility and height.
 */
export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>(currentState);

  useEffect(() => {
    initKeyboardManager();
    listeners.add(setState);
    setState(currentState);

    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
