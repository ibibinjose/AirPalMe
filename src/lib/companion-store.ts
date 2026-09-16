import {
  allowedAdminTransitions,
  validateCompanionApplication,
  type CompanionApplication,
  type CompanionApplicationInput,
  type CompanionStatus,
} from "@shared/companion";

const STORAGE_KEY = "airpal.companion.v1";
const NOTIFICATIONS_KEY = "airpal.companion-notifications.v1";
const MAX_NOTIFICATIONS = 100;

let cached: CompanionApplication[] = [];
let memoryNotifications: CompanionNotification[] = [];
const subscribers = new Set<() => void>();

export interface CompanionNotification {
  id: string;
  applicationId: string;
  userId: string;
  status: CompanionStatus;
  message: string;
  createdAt: string;
}

const STATUS_MESSAGE: Record<CompanionStatus, string> = {
  draft: "Your AirPal application draft was saved.",
  submitted: "Your AirPal application has been received.",
  under_review: "Your AirPal application is under review.",
  approved: "You're officially an AirPal.",
  declined: "Thank you for your interest in AirPal. Your application has not been approved at this time.",
  more_info: "We need a little more information about your AirPal application.",
  suspended: "Your AirPal availability is currently paused.",
};

function readFromStorage(): CompanionApplication[] {
  if (typeof window === "undefined") return [...cached];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(all: CompanionApplication[]): void {
  cached = all;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }
  subscribers.forEach((fn) => fn());
}

export function subscribeCompanions(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function loadApplications(): CompanionApplication[] {
  if (typeof window === "undefined") return [...cached];
  if (cached.length === 0) {
    const stored = readFromStorage();
    if (stored.length > 0) cached = stored;
  }
  return cached;
}

function persist(app: CompanionApplication): CompanionApplication {
  const all = loadApplications();
  const idx = all.findIndex((a) => a.applicationId === app.applicationId);
  const next = [...all];
  if (idx >= 0) next[idx] = app;
  else next.unshift(app);
  writeToStorage(next);
  recordNotification(app);
  return app;
}

export function getApplicationByUser(userId: string): CompanionApplication | undefined {
  return loadApplications().find((a) => a.userId === userId);
}

export function getApplication(applicationId: string): CompanionApplication | undefined {
  return loadApplications().find((a) => a.applicationId === applicationId);
}

function blankDraft(userId: string): CompanionApplication {
  const now = new Date().toISOString();
  return {
    applicationId: `cap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    roles: [],
    fullName: "",
    email: "",
    phone: "",
    city: "",
    suburb: "",
    ageRange: "",
    introduction: "",
    languages: [],
    interests: [],
    hobbies: [],
    enjoysWithOthers: "",
    activities: [],
    availability: [],
    serviceArea: "",
    pricingPreference: "unsure",
    motivation: "",
    policeClearanceNumber: "",
    applicantAgreementAccepted: false,
    communityGuidelinesAccepted: false,
    adultConfirmed: false,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

/** Create or resume the applicant's draft. */
export function getOrCreateDraft(userId: string): CompanionApplication {
  const existing = getApplicationByUser(userId);
  if (existing && (existing.status === "draft" || existing.status === "more_info")) return existing;
  if (existing) return existing;
  const draft = blankDraft(userId);
  writeToStorage([draft, ...loadApplications()]);
  return draft;
}

export function saveDraft(
  applicationId: string,
  patch: Partial<CompanionApplicationInput>,
): CompanionApplication | undefined {
  const current = getApplication(applicationId);
  if (!current || (current.status !== "draft" && current.status !== "more_info")) return undefined;
  const now = new Date().toISOString();
  const next: CompanionApplication = { ...current, ...patch, updatedAt: now };
  const all = loadApplications().map((a) => (a.applicationId === applicationId ? next : a));
  writeToStorage(all);
  return next;
}

/** Validate and submit (or resubmit after more_info). Returns errors when invalid. */
export function submitApplication(applicationId: string): {
  application?: CompanionApplication;
  errors?: { field: string; message: string }[];
} {
  const current = getApplication(applicationId);
  if (!current) return { errors: [{ field: "application", message: "Application not found." }] };
  if (current.status !== "draft" && current.status !== "more_info") {
    return { errors: [{ field: "status", message: "Only drafts can be submitted." }] };
  }
  const errors = validateCompanionApplication(current);
  if (errors.length > 0) return { errors };
  const now = new Date().toISOString();
  return {
    application: persist({
      ...current,
      status: current.status === "more_info" ? "under_review" : "submitted",
      submittedAt: current.submittedAt || now,
      updatedAt: now,
    }),
  };
}

export interface AdminApplicationUpdate {
  status: CompanionStatus;
  adminNotes?: string;
  reviewedBy?: string;
}

/** Admin review action. Enforces the status pipeline; records review metadata + notification. */
export function adminUpdateApplication(
  applicationId: string,
  update: AdminApplicationUpdate,
): { application?: CompanionApplication; error?: string } {
  const current = getApplication(applicationId);
  if (!current) return { error: "Application not found." };
  if (!allowedAdminTransitions(current.status).includes(update.status)) {
    return { error: `Cannot move from ${current.status} to ${update.status}.` };
  }
  const now = new Date().toISOString();
  return {
    application: persist({
      ...current,
      status: update.status,
      adminNotes: update.adminNotes ?? current.adminNotes,
      reviewedBy: update.reviewedBy,
      reviewedAt: now,
      updatedAt: now,
    }),
  };
}

/** Admin list with optional status/role/location filters. Includes private notes. */
export function listApplicationsForAdmin(filters?: {
  status?: CompanionStatus | "all";
  role?: string;
  location?: string;
}): CompanionApplication[] {
  return loadApplications().filter((a) => {
    if (filters?.status && filters.status !== "all" && a.status !== filters.status) return false;
    if (filters?.role && !a.roles.includes(filters.role as (typeof a.roles)[number])) return false;
    if (
      filters?.location &&
      !`${a.city} ${a.suburb} ${a.serviceArea}`.toLowerCase().includes(filters.location.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

function readNotifications(): CompanionNotification[] {
  if (typeof window === "undefined") return [...memoryNotifications];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordNotification(app: CompanionApplication): void {
  const record: CompanionNotification = {
    id: `cnotif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    applicationId: app.applicationId,
    userId: app.userId,
    status: app.status,
    message: STATUS_MESSAGE[app.status],
    createdAt: new Date().toISOString(),
  };
  const next = [...readNotifications(), record].slice(-MAX_NOTIFICATIONS);
  if (typeof window === "undefined") {
    memoryNotifications = next;
    return;
  }
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function listCompanionNotifications(userId?: string): CompanionNotification[] {
  const all = readNotifications();
  return userId ? all.filter((n) => n.userId === userId) : all;
}

export function clearCompanionStore(): void {
  cached = [];
  memoryNotifications = [];
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(NOTIFICATIONS_KEY);
    } catch {
      /* ignore */
    }
  }
}
