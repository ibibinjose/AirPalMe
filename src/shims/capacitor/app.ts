import type { PluginListenerHandle } from "./core";

export const App = {
  addListener: (_eventName: string, _listenerFunc: (...args: any[]) => void): Promise<PluginListenerHandle> =>
    Promise.resolve({ remove: () => Promise.resolve() }),
  removeAllListeners: () => Promise.resolve(),
  exitApp: () => Promise.resolve(),
  getInfo: () =>
    Promise.resolve({
      name: "AirPal",
      id: "me.airpal.app",
      build: "2",
      version: "2.0.0",
    }),
};
