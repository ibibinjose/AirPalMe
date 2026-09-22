/**
 * Synchronous double-submit guard for form/mutation handlers.
 *
 * State-based `busy` flags only disable a button after React re-renders, so a
 * second tap/click can fire the same mutation twice before the first resolves
 * (duplicate plans, double Stripe checkout sessions, duplicate mate requests).
 * A guard object held in a `useRef` closes that window synchronously:
 *
 *   const guard = useRef(createSubmitGuard());
 *   async function onSubmit() {
 *     if (!guard.current.tryAcquire()) return;
 *     try {
 *       await doMutation();
 *       nav(...); // success leaves the guard held; the screen unmounts
 *     } catch {
 *       guard.current.release(); // failure re-arms the form
 *     }
 *   }
 */
export interface SubmitGuard {
  readonly held: boolean;
  /** Returns true exactly once until `release()` — second callers get false. */
  tryAcquire(): boolean;
  release(): void;
}

export function createSubmitGuard(): SubmitGuard {
  let held = false;
  return {
    get held() {
      return held;
    },
    tryAcquire() {
      if (held) return false;
      held = true;
      return true;
    },
    release() {
      held = false;
    },
  };
}
