import { afterEach, describe, expect, it, vi } from "vitest";
import { onIdle } from "./on-idle";

function stubWindow(over: Record<string, unknown> = {}) {
  vi.stubGlobal("window", { setTimeout, clearTimeout, ...over });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("onIdle", () => {
  it("runs synchronously without a window (SSR/node)", () => {
    const cb = vi.fn();
    onIdle(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("falls back to a timer without requestIdleCallback", () => {
    vi.useFakeTimers();
    stubWindow();
    const cb = vi.fn();
    const cancel = onIdle(cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(cb).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("cancel prevents the fallback timer", () => {
    vi.useFakeTimers();
    stubWindow();
    const cb = vi.fn();
    const cancel = onIdle(cb);
    cancel();
    vi.advanceTimersByTime(100);
    expect(cb).not.toHaveBeenCalled();
  });

  it("uses requestIdleCallback when available", () => {
    const ric = vi.fn((_cb: () => void, _opts?: object) => 7 as unknown as number);
    const cic = vi.fn();
    stubWindow({ requestIdleCallback: ric, cancelIdleCallback: cic });
    const cancel = onIdle(() => undefined);
    expect(ric).toHaveBeenCalledTimes(1);
    cancel();
    expect(cic).toHaveBeenCalledWith(7);
  });
});
