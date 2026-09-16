import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { nextRetryDelayMs, type SyncJob, type SyncState } from "@/lib/sync";
import { maxSyncRetries } from "@/lib/battery";
import { liveBackendEnabled } from "@/lib/functions";
import { useOptionalBattery } from "@/hooks/useBattery";

type RunOpts = {
  id: string;
  label: string;
  remote?: () => Promise<unknown>;
};

type SyncValue = {
  jobs: SyncJob[];
  runJob: (opts: RunOpts) => Promise<void>;
  retry: (id: string) => Promise<void>;
  powerSaveActive: boolean;
};

const SyncContext = createContext<SyncValue | undefined>(undefined);

function stamp(job: Omit<SyncJob, "updatedAt">): SyncJob {
  return { ...job, updatedAt: new Date().toISOString() };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const remotes = useRef(new Map<string, () => Promise<unknown>>());
  const timers = useRef(new Map<string, number>());
  const battery = useOptionalBattery();
  const powerSaveActive = Boolean(battery?.powerSaveActive);

  const upsert = useCallback((job: SyncJob) => {
    setJobs((rows) => {
      const rest = rows.filter((row) => row.id !== job.id);
      if (job.state === "synced") {
        return [job, ...rest].slice(0, 12);
      }
      return [job, ...rest].slice(0, 12);
    });
  }, []);

  const execute = useCallback(
    async (opts: RunOpts, retries: number) => {
      const remote = opts.remote;
      remotes.current.set(opts.id, remote || (async () => undefined));
      if (!remote) {
        upsert(stamp({ id: opts.id, label: opts.label, state: "local", retries }));
        return;
      }
      if (!liveBackendEnabled()) {
        await remote();
        upsert(stamp({ id: opts.id, label: opts.label, state: "local", retries }));
        return;
      }
      upsert(stamp({ id: opts.id, label: opts.label, state: "syncing", retries }));
      try {
        await remote();
        upsert(stamp({ id: opts.id, label: opts.label, state: "synced", retries: 0 }));
      } catch (err) {
        const error = err instanceof Error ? err.message : "Sync failed";
        const nextRetries = retries + 1;
        const maxLimit = maxSyncRetries(powerSaveActive);
        if (nextRetries <= maxLimit) {
          upsert(stamp({ id: opts.id, label: opts.label, state: "pending_retry", error, retries: nextRetries }));
          const wait = nextRetryDelayMs(nextRetries, powerSaveActive);
          const handle = window.setTimeout(() => {
            void execute(opts, nextRetries);
          }, wait);
          timers.current.set(opts.id, handle);
        } else {
          upsert(stamp({ id: opts.id, label: opts.label, state: "failed", error, retries: nextRetries }));
        }
      }
    },
    [powerSaveActive, upsert],
  );

  const runJob = useCallback(
    async (opts: RunOpts) => {
      const existing = timers.current.get(opts.id);
      if (existing) window.clearTimeout(existing);
      await execute(opts, 0);
    },
    [execute],
  );

  const retry = useCallback(
    async (id: string) => {
      const job = jobs.find((row) => row.id === id);
      const remote = remotes.current.get(id);
      if (!job) return;
      await execute({ id, label: job.label, remote }, 0);
    },
    [execute, jobs],
  );

  const value = useMemo<SyncValue>(
    () => ({ jobs, runJob, retry, powerSaveActive }),
    [jobs, powerSaveActive, retry, runJob],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync");
  return ctx;
}

export function useOptionalSync() {
  return useContext(SyncContext);
}

export function patchJobState(jobs: SyncJob[], id: string, state: SyncState): SyncJob[] {
  return jobs.map((job) => (job.id === id ? { ...job, state, updatedAt: new Date().toISOString() } : job));
}
