export enum Style {
  Dark = "DARK",
  Light = "LIGHT",
  Default = "DEFAULT",
}

export const StatusBar = {
  setStyle: (_options?: { style: Style }) => Promise.resolve(),
  setBackgroundColor: (_options?: { color: string }) => Promise.resolve(),
  show: () => Promise.resolve(),
  hide: () => Promise.resolve(),
  setOverlaysWebView: (_options?: { overlay: boolean }) => Promise.resolve(),
};
