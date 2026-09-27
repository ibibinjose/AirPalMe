export enum ImpactStyle {
  Heavy = "HEAVY",
  Medium = "MEDIUM",
  Light = "LIGHT",
}

export enum NotificationType {
  Success = "SUCCESS",
  Warning = "WARNING",
  Error = "ERROR",
}

export const Haptics = {
  impact: (_options?: { style: ImpactStyle }) => Promise.resolve(),
  notification: (_options?: { type: NotificationType }) => Promise.resolve(),
  selectionStart: () => Promise.resolve(),
  selectionChanged: () => Promise.resolve(),
  selectionEnd: () => Promise.resolve(),
  vibrate: (_options?: { duration: number }) => Promise.resolve(),
};
