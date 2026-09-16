import { powerSaveRetryDelayMs } from "./battery";

export const SYNC_STATES = ["local", "syncing", "synced", "failed", "pending_retry"] as const;
export type SyncState = (typeof SYNC_STATES)[number];

export type SyncJob = {
  id: string;
  label: string;
  state: SyncState;
  error?: string;
  updatedAt: string;
  retries: number;
};

export function syncLabel(state: SyncState, powerSave = false): string {
  switch (state) {
    case "local":
      return "Saved on this device";
    case "syncing":
      return "Saving…";
    case "synced":
      return "Synced";
    case "failed":
      return "Couldn’t sync — retry";
    case "pending_retry":
      return powerSave ? "Waiting to retry (Power Saver active)" : "Waiting to retry";
  }
}

export function worstSyncState(jobs: SyncJob[]): SyncState | null {
  if (!jobs.length) return null;
  const rank: Record<SyncState, number> = {
    failed: 5,
    pending_retry: 4,
    syncing: 3,
    local: 2,
    synced: 1,
  };
  return jobs.reduce((worst, job) => (rank[job.state] > rank[worst] ? job.state : worst), jobs[0]!.state);
}

export function nextRetryDelayMs(retries: number, powerSave = false): number {
  if (powerSave) {
    return powerSaveRetryDelayMs(retries);
  }
  return Math.min(30_000, 1500 * 2 ** Math.max(0, retries));
}
