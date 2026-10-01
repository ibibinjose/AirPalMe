import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Archive, Cake, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  BIRTHDAY_MONTHS,
  BIRTHDAY_OFFER_CATEGORIES,
  BIRTHDAY_REGIONS,
  validateBirthdayOfferDraft,
  type BirthdayOffer,
  type BirthdayOfferCategory,
  type CreateBirthdayOfferRequest,
} from "@shared/birthday-freebies";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminSetBirthdayOfferStatusRemote,
  createBirthdayOfferRemote,
  friendlyBirthdayError,
  listBirthdayOffersRemote,
  seedBirthdayFreebiesRemote,
  updateBirthdayOfferRemote,
} from "@/lib/birthday-freebies";
import { liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

const BLANK: CreateBirthdayOfferRequest = {
  brand: "AirPal Editorial",
  title: "",
  description: "",
  rewardText: "",
  category: "food",
  regions: ["au"],
  birthdayMonths: [],
  howToClaim: "",
  claimUrl: "",
  adultOnly: true,
  status: "live",
  featured: false,
};

export function AdminBirthdayOffersPage() {
  const { isAdmin, authReady } = useAuth();
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [rows, setRows] = useState<BirthdayOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "archived">("all");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function reload() {
    if (!liveBackendEnabled()) {
      setLoading(false);
      return;
    }
    try {
      const res = await listBirthdayOffersRemote({ status: "any" });
      const list = res.offers || [];
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
        <p className="mt-1 text-sm text-mute">Birthday freebies admin is platform-admin only.</p>
        <Link href="/">
          <Button className="mt-4">Home</Button>
        </Link>
      </div>
    );
  }

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  async function setStatus(o: BirthdayOffer, status: "live" | "draft" | "archived") {
    setBusy(o.id + status);
    try {
      await adminSetBirthdayOfferStatusRemote({ offerId: o.id, status });
      toast.success(`Set ${status}.`);
      await reload();
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setBusy(null);
    }
  }

  async function createOrUpdate() {
    const errors = validateBirthdayOfferDraft(form as unknown as Record<string, unknown>);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setBusy("save");
    try {
      if (editId) {
        await updateBirthdayOfferRemote({
          offerId: editId,
          patch: {
            brand: form.brand,
            title: form.title,
            description: form.description || "",
            rewardText: form.rewardText,
            category: form.category,
            regions: form.regions,
            birthdayMonths: form.birthdayMonths || [],
            howToClaim: form.howToClaim,
            claimUrl: form.claimUrl || "",
            adultOnly: form.adultOnly !== false,
            featured: Boolean(form.featured),
            status: form.status || "live",
          },
        });
        toast.success("Updated.");
      } else {
        await createBirthdayOfferRemote({ ...form, status: form.status || "live" });
        toast.success("Created.");
      }
      setShowNew(false);
      setEditId(null);
      setForm({ ...BLANK });
      await reload();
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setBusy(null);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const res = await seedBirthdayFreebiesRemote();
      toast.success(`Seeded ${res.created} new, updated ${res.updated} (of ${res.total}).`);
      await reload();
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setSeeding(false);
    }
  }

  function startEdit(o: BirthdayOffer) {
    setEditId(o.id);
    setForm({
      brand: o.brand,
      title: o.title,
      description: o.description,
      rewardText: o.rewardText,
      category: o.category,
      regions: o.regions,
      birthdayMonths: o.birthdayMonths,
      howToClaim: o.howToClaim,
      claimUrl: o.claimUrl || "",
      adultOnly: o.adultOnly,
      featured: o.featured,
      status: o.status,
    });
    setShowNew(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Admin
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Birthday freebies</h1>
          <p className="mt-0.5 text-sm text-mute">Editorial + business offers · Mate meetup framing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" loading={seeding} onClick={() => void seed()}>
            Seed catalog
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditId(null);
              setForm({ ...BLANK });
              setShowNew((v) => !v);
            }}
          >
            <Plus size={14} /> {showNew ? "Close" : "New"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "live", "draft", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold ring-1",
              filter === f ? "bg-brand text-white ring-brand" : "bg-card ring-line",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {showNew ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-line">
          <p className="font-display text-lg font-bold">{editId ? "Edit offer" : "New editorial offer"}</p>
          {(
            [
              ["brand", "Brand"],
              ["title", "Title"],
              ["rewardText", "Reward"],
              ["howToClaim", "How to claim"],
              ["claimUrl", "Claim URL"],
              ["description", "Description"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[11px] font-semibold uppercase text-mute">{label}</span>
              <input
                className="mt-1 w-full rounded-2xl bg-paper px-3 py-2 text-sm ring-1 ring-line"
                value={String(form[key] || "")}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-mute">Category</span>
            <select
              className="mt-1 w-full rounded-2xl bg-paper px-3 py-2 text-sm ring-1 ring-line"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as BirthdayOfferCategory })}
            >
              {BIRTHDAY_OFFER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {BIRTHDAY_REGIONS.map((r) => {
              const on = form.regions.includes(r.code);
              return (
                <button
                  key={r.code}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                    on ? "bg-brand text-white ring-brand" : "bg-paper ring-line",
                  )}
                  onClick={() => {
                    const set = new Set(form.regions);
                    if (on) set.delete(r.code);
                    else set.add(r.code);
                    setForm({ ...form, regions: Array.from(set) });
                  }}
                >
                  {r.code.toUpperCase()}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BIRTHDAY_MONTHS.map((m) => {
              const on = (form.birthdayMonths || []).includes(m.value);
              return (
                <button
                  key={m.value}
                  type="button"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                    on ? "bg-brand text-white ring-brand" : "bg-paper ring-line",
                  )}
                  onClick={() => {
                    const set = new Set(form.birthdayMonths || []);
                    if (on) set.delete(m.value);
                    else set.add(m.value);
                    setForm({ ...form, birthdayMonths: Array.from(set).sort((a, b) => a - b) });
                  }}
                >
                  {m.short}
                </button>
              );
            })}
            <button
              type="button"
              className="text-[10px] font-bold text-brand"
              onClick={() => setForm({ ...form, birthdayMonths: [] })}
            >
              All months
            </button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured === true}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Featured
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.adultOnly !== false}
                onChange={(e) => setForm({ ...form, adultOnly: e.target.checked })}
              />
              Adult 18+
            </label>
            <select
              className="rounded-full bg-paper px-2 py-1 text-xs ring-1 ring-line"
              value={form.status || "live"}
              onChange={(e) => setForm({ ...form, status: e.target.value as CreateBirthdayOfferRequest["status"] })}
            >
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <Button loading={busy === "save"} onClick={() => void createOrUpdate()}>
            {editId ? "Save" : "Create live / draft"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <Cake size={28} className="mx-auto text-mute" />
          <p className="mt-2 text-sm text-mute">No offers yet. Seed the editorial catalog or create one.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((o) => (
            <div key={o.id} className="rounded-2xl bg-card p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase text-mute ring-1 ring-line">
                  {o.status}
                </span>
                <span className="text-[11px] text-mute">
                  {o.regions.map((r) => r.toUpperCase()).join(", ")} · {o.ownerType}
                  {o.editorial ? " · editorial" : ""}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {o.brand} — {o.title}
              </p>
              <p className="text-xs text-mute">{o.rewardText}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => startEdit(o)}>
                  Edit
                </Button>
                {o.status !== "live" ? (
                  <Button size="sm" variant="tonal" loading={busy === o.id + "live"} onClick={() => void setStatus(o, "live")}>
                    <Play size={13} /> Live
                  </Button>
                ) : null}
                {o.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === o.id + "archived"}
                    onClick={() => void setStatus(o, "archived")}
                  >
                    <Archive size={13} /> Archive
                  </Button>
                ) : null}
                {o.status === "archived" ? (
                  <Button size="sm" variant="ghost" loading={busy === o.id + "draft"} onClick={() => void setStatus(o, "draft")}>
                    To draft
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
