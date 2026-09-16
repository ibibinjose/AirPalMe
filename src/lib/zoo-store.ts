import { emptyZoo, ZOO_STASH_KEY, type ZooState } from "@shared/zoo";

function read(): ZooState {
  try {
    const raw = localStorage.getItem(ZOO_STASH_KEY);
    if (!raw) return emptyZoo();
    const parsed = JSON.parse(raw) as ZooState;
    return {
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      shops: Array.isArray(parsed.shops) ? parsed.shops : [],
    };
  } catch {
    return emptyZoo();
  }
}

const listeners = new Set<() => void>();

export function loadZoo(): ZooState {
  return read();
}

export function persistZoo(state: ZooState) {
  try {
    localStorage.setItem(ZOO_STASH_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeZoo(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
