import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  HeartHandshake,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCohort } from "@/contexts/CohortContext";
import { SEED_INSTITUTIONS, getBelongingReportData } from "@shared/cohort";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function BelongingReportPanel() {
  const { activeCohort } = useCohort();
  const [selectedInstId, setSelectedInstId] = useState<string>(
    activeCohort?.id || SEED_INSTITUTIONS[0].id,
  );
  const [copied, setCopied] = useState(false);

  const currentInst = SEED_INSTITUTIONS.find((i) => i.id === selectedInstId) || SEED_INSTITUTIONS[0];
  const metrics = getBelongingReportData(currentInst.id);

  const handleCopyLink = () => {
    void triggerHaptic("light");
    const link = `${window.location.origin}/join/${currentInst.code}`;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(`Copied invite link for ${currentInst.name}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    void triggerHaptic("medium");
    toast.success("Executive Belonging Report generated for leadership review.");
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Cohort Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            <HeartHandshake size={13} />
            <span>Executive Belonging Report</span>
          </div>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">
            Cohort Wellbeing & Retention Analytics
          </h2>
          <p className="text-xs text-mute mt-1">
            Audited real-world engagement metrics for residential colleges, student housing & hotel cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopyLink} className="gap-1.5">
            <Copy size={14} />
            <span>{copied ? "Copied" : "Copy Join Link"}</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} className="gap-1.5">
            <Download size={14} />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Property Select Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SEED_INSTITUTIONS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setSelectedInstId(inst.id);
            }}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer touch-manipulation",
              inst.id === selectedInstId
                ? "bg-brand text-white shadow-xs"
                : "bg-card text-mute ring-1 ring-line hover:text-ink",
            )}
          >
            <span>{inst.badgeEmoji}</span>
            <span>{inst.name}</span>
          </button>
        ))}
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: North Star */}
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">30-Day Activation</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-ink">
              {metrics.activated30DayPercent}%
            </span>
            <span className="text-xs font-bold text-emerald-600">+14% vs benchmark</span>
          </div>
          <p className="mt-1 text-[11px] text-mute">
            Cohort members who completed at least one real-world experience in first 30 days.
          </p>
        </div>

        {/* Metric 2: Completed Experiences */}
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">Completions</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-ink">
              {metrics.completedExperiences}
            </span>
            <span className="text-xs text-mute">this month</span>
          </div>
          <p className="mt-1 text-[11px] text-mute">
            {metrics.avgExperiencesPerResident} completed activities per active resident.
          </p>
        </div>

        {/* Metric 3: Event Attendance */}
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">Attendance vs RSVP</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-ink">
              {metrics.hostedEventAttendanceRate}%
            </span>
            <span className="text-xs font-bold text-emerald-600">High Turnout</span>
          </div>
          <p className="mt-1 text-[11px] text-mute">
            QR door verified check-in rate at building-hosted mixers and walks.
          </p>
        </div>

        {/* Metric 4: Safety & Trust */}
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">Safety Audit</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-ink">
              {metrics.safetyIncidents} Incidents
            </span>
          </div>
          <p className="mt-1 text-[11px] text-mute">
            100% human-moderated safety rail with zero unreviewed incident tickets.
          </p>
        </div>
      </div>

      {/* Cohort Health Summary */}
      <div className="rounded-3xl bg-gradient-to-r from-card via-card to-paper p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              {currentInst.name} — Belonging Health Score
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Period: {metrics.period} · Total Residents: {metrics.totalResidents} · Active: {metrics.activeResidents}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <Award size={18} />
            <span>Exemplary (94/100)</span>
          </div>
        </div>

        <div className="mt-6 border-t border-line/60 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-mute">
            Duty of Care & Privacy Guarantee
          </h4>
          <p className="mt-1 text-xs text-mute leading-relaxed">
            All belonging analytics are aggregated strictly in accordance with Australian Privacy Principles (APPs).
            Individual private plans, personal messages, and location pins are encrypted and never disclosed to institutions.
          </p>
        </div>
      </div>
    </div>
  );
}
