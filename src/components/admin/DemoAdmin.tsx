import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, FlaskConical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { teardownDemoBusinessRemote } from "@/lib/functions";
import { DEMO_TEARDOWN_COLLECTIONS } from "@shared/demo-business";
import { toast } from "sonner";

const BUILD_STEPS = [
  {
    n: "1",
    title: "Business listing",
    body: "Real business onboarding, prefilled as Demo Harbour Hotel. Review each step and submit.",
    href: "/business/onboard?demo=1",
  },
  {
    n: "2",
    title: "Stay property",
    body: "Real host activation, prefilled. Creates the demo property, rooms shell, and lobby marker.",
    href: "/host?demo=1",
  },
  {
    n: "3",
    title: "Event",
    body: "Real organiser flow, prefilled as Demo Rooftop Sessions. Always creates — never edits your drafts.",
    href: "/event?demo=1",
  },
];

/**
 * Demo-business workspace: build the /Demo showcase through the real
 * onboarding flows, or wipe every demo doc. Demo docs carry demo:true +
 * demo- ids: hidden from guest discovery, excluded from KPIs.
 */
export function DemoAdmin() {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  async function teardown() {
    if (!armed || busy) return;
    setBusy(true);
    try {
      const res = await teardownDemoBusinessRemote();
      setResult(res.deleted);
      setArmed(false);
      const total = Object.values(res.deleted).reduce((a, b) => a + b, 0);
      toast.success(total ? `Demo data removed (${total} docs).` : "No demo data found.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teardown failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-accent">
            <FlaskConical size={18} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Demo business</h2>
            <p className="text-xs text-mute">Showcase data for /Demo — never mixed into live supply.</p>
          </div>
        </div>

        <ol className="mt-4 space-y-2">
          {BUILD_STEPS.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line transition hover:ring-brand/30"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                  {s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">{s.title}</span>
                  <span className="block text-xs leading-5 text-mute">{s.body}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-mute" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-5 text-mute">
          Fixed demo ids — re-running a step overwrites the same docs, never duplicates. Sweeps{" "}
          {DEMO_TEARDOWN_COLLECTIONS.join(", ")} plus property menu/private/qrCodes and event stalls.
        </p>
        <Link
          href="/concierge"
          className="mt-3 flex items-center gap-2 rounded-2xl bg-brand/10 p-3 text-sm font-bold text-accent ring-1 ring-brand/20 transition hover:bg-brand/15"
        >
          View Stay & Guide <ArrowRight size={16} />
        </Link>
      </section>

      <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
        <h3 className="text-sm font-bold text-ink">Tear down demo data</h3>
        <p className="mt-1 text-xs leading-5 text-mute">
          Deletes every demo-flagged doc. Live data is untouched — the wipe matches demo only.
        </p>
        {result && (
          <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {Object.entries(result).map(([col, n]) => (
              <div key={col} className="rounded-xl bg-paper px-2.5 py-1.5 ring-1 ring-line">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-mute">{col}</dt>
                <dd className="text-sm font-bold text-ink">{n} removed</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-3 flex gap-2">
          {!armed ? (
            <Button variant="outlined" size="sm" onClick={() => setArmed(true)} className="gap-1.5">
              <Trash2 size={14} /> Tear down…
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void teardown()}
                className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={14} /> {busy ? "Wiping…" : "Confirm wipe"}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setArmed(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
