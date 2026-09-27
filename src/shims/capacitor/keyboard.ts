import type { PluginListenerHandle } from "./core";

export interface KeyboardInfo {
  keyboardHeight: number;
}

export const Keyboard = {
  addListener: (_eventName: string, _listenerFunc: (...args: any[]) => void): Promise<PluginListenerHandle> =>
    Promise.resolve({ remove: () => Promise.resolve() }),
  removeAllListeners: () => Promise.resolve(),
  hide: () => Promise.resolve(),
  show: () => Promise.resolve(),
};
