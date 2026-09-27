export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: (): "ios" | "android" | "web" => "web",
  isPluginAvailable: (_name: string) => false,
  convertFileSrc: (filePath: string) => filePath,
};

export type PluginListenerHandle = {
  remove: () => Promise<void>;
};
