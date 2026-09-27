export const SplashScreen = {
  show: (_options?: { autoHide?: boolean; fadeInDuration?: number; fadeOutDuration?: number; showDuration?: number }) =>
    Promise.resolve(),
  hide: (_options?: { fadeOutDuration?: number }) => Promise.resolve(),
};
