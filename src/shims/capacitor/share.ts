export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export interface ShareResult {
  activityType?: string;
}

export const Share = {
  canShare: async () => ({
    value: typeof navigator !== "undefined" && typeof navigator.share === "function",
  }),
  share: async (options: ShareOptions): Promise<ShareResult> => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(options);
    }
    return {};
  },
};
