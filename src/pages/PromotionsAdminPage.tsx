import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs } from "firebase/firestore";
import { ArrowLeft, Pause, Play, Plus, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { PromoStatusChip } from "@/components/promotions/PromoStatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { liveBackendEnabled } from "@/lib/functions";
import {
  createPromotionRemote,
  friendlyPromotionError,
  reviewPromotionRemote,
  seedPromotionDemoRemote,
} from "@/lib/promotions";
import { cn } from "@/lib/cn";
import {
  MECHANIC_TYPES,
  PROMOTION_CATEGORIES,
  type Promotion,
  type ReviewPromotionRequest,
} from "@shared/promotions";

const BLANK = {
  kind: "giveaway",
  mechanicType: "giveaway",
  title: "",
  description: "",
  sponsorName: "AirPal",
  category: "AirPal",
  prizeTitle: "",
  prizeValue: "",
  eligibility: "Open to AirPal members aged 18+ where permitted.",
  entryLimit: 1,
  startAt: "",
  endAt: "",
  termsText: "Subject to the official promotion terms. No purchase necessary. Entry does not guarantee winning.",
};

export function PromotionsAdminPage() {
  const { isAdmin, authReady } = useAuth();
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"queue" | "live" | "all">("queue");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function reload() {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(collection(db, "promotions"));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
      list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (locked) return;
    void reload();
  }, [locked]);

  if (!authReady) return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-mute">Loading…</p>;
  if (locked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl font-bold">Restricted</p>
        <p className="mt-1 text-sm text-mute">Promotion management is admin-only.</p>
        <Link href="/"><Button className="mt-4">Home</Button></Link>
      </div>
    );
  }

  const queue = rows.filter((r) => ["submitted", "under_review"].includes(r.status));
  const live = rows.filter((r) => ["live", "paused", "scheduled", "approved"].includes(r.status));
  const shown = filter === "queue" ? queue : filter === "live" ? live : rows;

  async function act(p: Promotion, decision: ReviewPromotionRequest["decision"]) {
    const reason = decision === "reject" || decision === "request_changes"
      ? window.prompt("Reason (recorded in the audit log):") || ""
      : "";
    setBusy(p.id + decision);
    try {
      await reviewPromotionRemote({ promotionId: p.id, decision, reason });
      toast.success(`Campaign ${decision.replace("_", " ")}.`);
      await reload();
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    setBusy("create");
    try {
      const res = await createPromotionRemote({
        kind: form.kind as "giveaway" | "promotion",
        mechanicType: form.mechanicType as (typeof MECHANIC_TYPES)[number],
        title: form.title,
        description: form.description,
        sponsorName: form.sponsorName,
        category: form.category,
        prizeTitle: form.prizeTitle,
        prizeValue: form.prizeValue,
        eligibility: form.eligibility,
        entryLimit: Number(form.entryLimit) || 1,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        termsText: form.termsText,
      });
      toast.success("Draft created.");
      setForm({ ...BLANK });
      setShowNew(false);
      await reload();
      void res;
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(null);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const res = await seedPromotionDemoRemote();
      toast.success(res.created ? `Seeded ${res.created} demo campaigns.` : "Demo campaigns already exist.");
      await reload();
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setSeeding(false);
    }
  }

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Admin
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Promotions</h1>
        <div className="flex gap-2">
          <Button onClick={seed} disabled={seeding} className="bg-card text-ink border-2 border-ink">
            {seeding ? "Seeding…" : "Seed demo"}
          </Button>
          <Button onClick={() => setShowNew((s) => !s)}>
            <Plus size={15} /> New
          </Button>
        </div>
      </div>

      {showNew && (
        <div className="mt-4 space-y-2 rounded-3xl border-2 border-ink bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Kind
              <select value={form.kind} onChange={(e) => set("kind", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm">
                <option value="giveaway">Giveaway</option>
                <option value="promotion">Promotion</option>
              </select>
            </label>
            <label className="text-xs font-semibold">Mechanic
              <select value={form.mechanicType} onChange={(e) => set("mechanicType", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm">
                {MECHANIC_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          {[
            ["title", "Title"],
            ["sponsorName", "Sponsor"],
            ["prizeTitle", "Prize title"],
            ["prizeValue", "Prize value (e.g. ₹25,000 approx. / 20% off)"],
            ["eligibility", "Eligibility"],
          ].map(([k, label]) => (
            <label key={k} className="block text-xs font-semibold">{label}
              <input value={String(form[k as keyof typeof form])} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
            </label>
          ))}
          <label className="block text-xs font-semibold">Description
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Category
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm">
                {PROMOTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Entry limit
              <input type="number" min={1} value={form.entryLimit} onChange={(e) => set("entryLimit", Number(e.target.value))} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold">Starts
              <input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold">Ends
              <input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
            </label>
          </div>
          <label className="block text-xs font-semibold">Terms
            <textarea value={form.termsText} onChange={(e) => set("termsText", e.target.value)} rows={3} className="mt-1 w-full rounded-xl border-2 border-ink/15 p-2 text-sm font-normal" />
          </label>
          <Button onClick={create} disabled={busy === "create" || !form.title || !form.startAt || !form.endAt} className="w-full">
            {busy === "create" ? "Creating…" : "Create draft"}
          </Button>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {(["queue", "live", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border-2 px-3 py-1 text-xs font-semibold capitalize",
              filter === f ? "border-ink bg-ink text-white" : "border-ink/15 bg-card",
            )}
          >
            {f} ({f === "queue" ? queue.length : f === "live" ? live.length : rows.length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading campaigns…</p>
      ) : shown.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center text-sm text-mute">
          Nothing here. Create a draft or seed the demo campaigns.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-ink bg-card p-3">
              <div className="flex items-center gap-2">
                <PromoStatusChip status={p.status} featured={p.featured} />
                <span className="text-[11px] text-mute">{p.kind} · {p.mechanicType} · legal: {p.legalReviewStatus.replace("_", " ")}</span>
              </div>
              <p className="mt-1 text-sm font-bold">{p.title}</p>
              <p className="truncate text-xs text-mute">{p.sponsorName} · ends {p.endAt ? new Date(p.endAt).toLocaleDateString() : "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["approve", "reject", "request_changes", "publish", "pause", "resume", "close", "archive"] as const)
                  .filter((d) => {
                    if (["submitted", "under_review"].includes(p.status)) return ["approve", "reject", "request_changes"].includes(d);
                    if (p.status === "approved" || p.status === "scheduled") return ["publish", "archive"].includes(d);
                    if (p.status === "live") return ["pause", "close"].includes(d);
                    if (p.status === "paused") return ["resume", "close"].includes(d);
                    if (["closed", "rejected"].includes(p.status)) return d === "archive";
                    return false;
                  })
                  .map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={busy === p.id + d}
                      onClick={() => act(p, d)}
                      className="rounded-lg border border-ink/20 px-2 py-1 text-[11px] font-bold hover:bg-ink hover:text-white disabled:opacity-50"
                    >
                      {d.replace("_", " ")}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={busy === p.id + (p.featured ? "unfeature" : "feature")}
                  onClick={() => act(p, p.featured ? "unfeature" : "feature")}
                  className="inline-flex items-center gap-1 rounded-lg border border-ink/20 px-2 py-1 text-[11px] font-bold hover:bg-ink hover:text-white disabled:opacity-50"
                >
                  {p.featured ? <StarOff size={11} /> : <Star size={11} />}
                  {p.featured ? "unfeature" : "feature"}
                </button>
                {p.status === "paused"
                  ? <button type="button" onClick={() => act(p, "resume")} className="inline-flex items-center gap-1 rounded-lg border border-ink/20 px-2 py-1 text-[11px] font-bold"><Play size={11} />resume</button>
                  : p.status === "live" && (
                    <button type="button" onClick={() => act(p, "pause")} className="inline-flex items-center gap-1 rounded-lg border border-ink/20 px-2 py-1 text-[11px] font-bold"><Pause size={11} />pause</button>
                  )}
                <Link href={p.kind === "giveaway" ? `/giveaways/${p.id}` : `/promotions/${p.id}`} className="rounded-lg px-2 py-1 text-[11px] font-bold text-brand hover:underline">
                  view
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
