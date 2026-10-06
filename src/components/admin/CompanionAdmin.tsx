import { useMemo, useState } from "react";
import { BadgeCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCompanion } from "@/contexts/CompanionContext";
import {
  allowedAdminTransitions,
  COMPANION_ROLES,
  COMPANION_STATUSES,
  COMPANION_STATUS_LABEL,
  flagsRegulatedClaims,
  type CompanionApplication,
  type CompanionStatus,
} from "@shared/companion";
import { cn } from "@/lib/cn";

const REVIEW_CHECKLIST = [
  "Identity / profile information",
  "Profile photo",
  "Police clearance certificate verified",
  "Application quality",
  "Selected activities",
  "Motivation",
  "Location",
  "Appropriate role selection",
  "Community standards agreement",
  "Any obvious safety concerns",
  "No regulated / professional service claims",
];

function statusPill(status: CompanionStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30";
    case "under_review":
    case "more_info":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30";
    case "submitted":
      return "bg-brand/10 text-accent ring-brand/30";
    case "declined":
    case "suspended":
      return "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/30";
    default:
      return "bg-paper text-mute ring-line";
  }
}

export function CompanionAdmin() {
  const { allApplications, adminList, adminUpdate } = useCompanion();
  const [statusFilter, setStatusFilter] = useState<CompanionStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      adminList({
        status: statusFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        location: locationFilter.trim() || undefined,
      }),
    [adminList, allApplications, statusFilter, roleFilter, locationFilter],
  );

  const counts = useMemo(() => {
    const map = new Map<CompanionStatus, number>();
    for (const a of allApplications) map.set(a.status, (map.get(a.status) || 0) + 1);
    return map;
  }, [allApplications]);

  const act = (app: CompanionApplication, status: CompanionStatus) => {
    setBusy(true);
    try {
      if (adminUpdate(app.applicationId, status, { adminNotes: notes.trim() || undefined })) {
        setNotes("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">AirPal Companion</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Applications</h2>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {(
          [
            ["submitted", "Submitted"],
            ["under_review", "In review"],
            ["approved", "Approved"],
            ["declined", "Declined"],
          ] as const
        ).map(([s, label]) => (
          <div key={s} className="rounded-2xl bg-paper p-3 text-center">
            <p className="font-display text-2xl font-semibold">{counts.get(s) || 0}</p>
            <p className="text-[11px] text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CompanionStatus | "all")}
          aria-label="Filter by status"
          className="h-10 rounded-2xl bg-paper px-3 text-xs border border-line outline-none text-ink focus:border-brand"
        >
          <option value="all">All statuses</option>
          {COMPANION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {COMPANION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="h-10 rounded-2xl bg-paper px-3 text-xs border border-line outline-none text-ink focus:border-brand"
        >
          <option value="all">All roles</option>
          {COMPANION_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Filter by location…"
          aria-label="Filter by location"
          className="h-10 rounded-2xl bg-paper px-3 text-xs border border-line outline-none text-ink focus:border-brand"
        />
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((a) => (
          <li key={a.applicationId} className="rounded-2xl bg-paper ring-1 ring-line">
            <button
              type="button"
              onClick={() => {
                setOpenId(openId === a.applicationId ? null : a.applicationId);
                setNotes(a.adminNotes || "");
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {a.fullName || "Unnamed applicant"}
                  {flagsRegulatedClaims(a) && (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      CHECK CLAIMS
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-mute">
                  {a.roles.join(", ") || "No roles"} · {[a.suburb, a.city].filter(Boolean).join(", ") || "No location"}{" "}
                  · {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "Draft"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                    statusPill(a.status),
                  )}
                >
                  {COMPANION_STATUS_LABEL[a.status]}
                </span>
                <Eye size={15} className="text-mute" />
              </span>
            </button>

            {openId === a.applicationId && (
              <div className="border-t border-line/60 px-4 py-4 space-y-3 text-sm">
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  <Detail label="Contact" value={[a.email, a.phone].filter(Boolean).join(" · ") || "—"} />
                  <Detail label="Age range" value={a.ageRange || "—"} />
                  <Detail label="Service area" value={a.serviceArea || "—"} />
                  <Detail
                    label="Pricing"
                    value={
                      a.pricingPreference === "paid" ? `Paid (${a.preferredRate || "no rate"})` : a.pricingPreference
                    }
                  />
                  <Detail label="Availability" value={a.availability.join(", ") || "—"} />
                  <Detail label="Police clearance no." value={a.policeClearanceNumber || "MISSING"} />
                  <Detail label="Languages" value={a.languages.join(", ") || "—"} />
                  <Detail label="Activities" value={a.activities.join(", ") || "—"} />
                  <Detail label="Interests" value={[...a.interests, ...a.hobbies].join(", ") || "—"} />
                </dl>
                {a.policeClearanceDoc ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                      Police clearance scan (reviewers only)
                    </dt>
                    <dd className="mt-1">
                      <a href={a.policeClearanceDoc} target="_blank" rel="noreferrer">
                        <img
                          src={a.policeClearanceDoc}
                          alt="Police clearance certificate scan"
                          className="max-h-40 rounded-xl ring-1 ring-line"
                        />
                      </a>
                    </dd>
                  </div>
                ) : (
                  <Detail label="Police clearance scan" value="MISSING" />
                )}
                <Detail label="Introduction" value={a.introduction || "—"} />
                <Detail label="Enjoys with others" value={a.enjoysWithOthers || "—"} />
                <Detail label="Motivation" value={a.motivation || "—"} />

                <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink">Admin review checklist</p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {REVIEW_CHECKLIST.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-mute">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-3 block text-xs font-semibold text-ink">
                    Admin review notes (private — never shown publicly)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Private notes for reviewers only…"
                    className="mt-1 w-full rounded-2xl bg-card p-3 text-xs border border-line outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {allowedAdminTransitions(a.status).map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      disabled={busy}
                      variant={
                        next === "approved"
                          ? "primary"
                          : next === "declined" || next === "suspended"
                            ? "ghost"
                            : "ghost"
                      }
                      onClick={() => act(a, next)}
                      className={cn(
                        next === "declined" || next === "suspended" ? "text-red-600 dark:text-red-400" : "",
                      )}
                    >
                      {next === "under_review"
                        ? "Start review"
                        : next === "more_info"
                          ? "Request info"
                          : COMPANION_STATUS_LABEL[next]}
                    </Button>
                  ))}
                  {a.status === "approved" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <BadgeCheck size={13} />
                      AirPal Approved
                    </span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-mute">No applications match.</p>}
      </ul>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">{label}</dt>
      <dd className="text-sm text-ink break-words">{value}</dd>
    </div>
  );
}
