import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompanionApplication, CompanionApplicationInput, CompanionStatus } from "@shared/companion";
import {
  adminUpdateApplication,
  getApplicationByUser,
  getOrCreateDraft,
  listApplicationsForAdmin,
  hydrateApplications,
  loadApplications,
  saveDraft,
  submitApplication,
  subscribeCompanions,
} from "@/lib/companion-store";
import {
  loadAllApplicationsRemote,
  loadMyApplicationsRemote,
  persistAdminApplicationRemote,
  persistApplicationRemote,
} from "@/lib/companion-remote";
import { useAuth } from "./AuthContext";
import { useBio } from "./BioContext";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface CompanionContextValue {
  application: CompanionApplication | undefined;
  allApplications: CompanionApplication[];
  startApplication: () => CompanionApplication | undefined;
  save: (patch: Partial<CompanionApplicationInput>) => CompanionApplication | undefined;
  submit: () => { errors?: { field: string; message: string }[] };
  adminList: (filters?: {
    status?: CompanionStatus | "all";
    role?: string;
    location?: string;
  }) => CompanionApplication[];
  adminUpdate: (applicationId: string, status: CompanionStatus, opts?: { adminNotes?: string }) => boolean;
}

const CompanionContext = createContext<CompanionContextValue | undefined>(undefined);

function currentUserId(user: { uid?: string } | null | undefined, email?: string): string {
  if (user?.uid) return user.uid;
  if (typeof window !== "undefined") {
    let anon = localStorage.getItem("airpal.anon.id");
    if (!anon) {
      anon = `anon-${Date.now()}`;
      localStorage.setItem("airpal.anon.id", anon);
    }
    return anon;
  }
  return email || "anonymous";
}

export function CompanionProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const { mine } = useBio();
  const [tick, setTick] = useState(0);
  const [remoteApps, setRemoteApps] = useState<CompanionApplication[]>([]);

  useEffect(() => subscribeCompanions(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!user?.uid) {
      setRemoteApps([]);
      return;
    }
    let cancelled = false;
    const load = isAdmin ? loadAllApplicationsRemote() : loadMyApplicationsRemote(user.uid);
    void load
      .then((rows) => {
        if (cancelled) return;
        hydrateApplications(rows);
        setRemoteApps(rows);
      })
      .catch(() => {
        if (!cancelled) setRemoteApps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, isAdmin, tick]);

  const userId = currentUserId(user, user?.email || undefined);
  void tick;
  const localApp = getApplicationByUser(userId);
  const remoteMine = remoteApps.find((a) => a.userId === userId);
  const application = remoteMine || localApp;
  const allApplications = useMemo(() => {
    const local = loadApplications();
    if (remoteApps.length === 0) return local;
    const byId = new Map<string, CompanionApplication>();
    for (const row of local) byId.set(row.applicationId, row);
    for (const row of remoteApps) byId.set(row.applicationId, row);
    return Array.from(byId.values());
  }, [remoteApps, tick]);

  const startApplication = useCallback(() => {
    const uid = currentUserId(user, user?.email || undefined);
    const existing = getApplicationByUser(uid);
    if (existing && existing.status !== "draft" && existing.status !== "more_info") return existing;
    const draft = getOrCreateDraft(uid);
    // Prefill from the account once, never overwrite what the applicant typed.
    const patch: Partial<CompanionApplicationInput> = {};
    const accountName = user?.displayName || mine?.name;
    if (accountName && !draft.fullName) patch.fullName = accountName;
    if (user?.email && !draft.email) patch.email = user.email;
    if (mine?.avatar && !draft.photo) patch.photo = mine.avatar;
    const started = Object.keys(patch).length > 0 ? saveDraft(draft.applicationId, patch) || draft : draft;
    if (user?.uid) void persistApplicationRemote(started).catch(() => undefined);
    void track("companion_application_started", {});
    return started;
  }, [user, mine]);

  const save = useCallback(
    (patch: Partial<CompanionApplicationInput>) => {
      if (!application) return undefined;
      const next = saveDraft(application.applicationId, patch);
      if (next && user?.uid) void persistApplicationRemote(next).catch(() => undefined);
      return next;
    },
    [application, user?.uid],
  );

  const submit = useCallback(() => {
    if (!application) return { errors: [{ field: "application", message: "Start an application first." }] };
    const res = submitApplication(application.applicationId);
    if (res.errors) return { errors: res.errors };
    if (res.application && user?.uid) void persistApplicationRemote(res.application).catch(() => undefined);
    toast.success("Your AirPal application has been received.");
    void track("companion_application_submitted", { roles: application.roles.join(",") });
    return {};
  }, [application, user?.uid]);

  const adminList = useCallback(
    (filters?: { status?: CompanionStatus | "all"; role?: string; location?: string }) =>
      listApplicationsForAdmin(filters),
    [],
  );

  const adminUpdate = useCallback(
    (applicationId: string, status: CompanionStatus, opts?: { adminNotes?: string }) => {
      const actor = user?.displayName || user?.email || "admin";
      const res = adminUpdateApplication(applicationId, { status, adminNotes: opts?.adminNotes, reviewedBy: actor });
      if (res.error || !res.application) {
        toast.error(res.error || "Could not update application.");
        return false;
      }
      const messages: Record<CompanionStatus, string> = {
        draft: "Moved back to draft.",
        submitted: "Marked as submitted.",
        under_review: "Marked as under review.",
        approved: "Your AirPal Companion application has been approved.",
        declined: "Application declined.",
        more_info: "We need a little more information about your AirPal application.",
        suspended: "AirPal availability paused.",
      };
      toast.success(messages[status]);
      void track("companion_application_reviewed", { status });
      if (res.application) void persistAdminApplicationRemote(res.application).catch(() => undefined);
      return true;
    },
    [user],
  );

  return (
    <CompanionContext.Provider
      value={{ application, allApplications, startApplication, save, submit, adminList, adminUpdate }}
    >
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used within CompanionProvider");
  return ctx;
}
