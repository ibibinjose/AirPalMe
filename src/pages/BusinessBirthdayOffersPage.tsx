import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Cake, Plus } from "lucide-react";
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
  createBirthdayOfferRemote,
  friendlyBirthdayError,
  listBirthdayOffersRemote,
  updateBirthdayOfferRemote,
} from "@/lib/birthday-freebies";
import { liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

const BLANK: CreateBirthdayOfferRequest = {
  brand: "",
  title: "",
  description: "",
  rewardText: "",
  category: "food",
  regions: ["au"],
  birthdayMonths: [],
  howToClaim: "",
  claimUrl: "",
  adultOnly: true,
  status: "draft",
};

const STATUS_TINT: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700",
  draft: "bg-ink/10 text-mute",
  archived: "bg-ink/10 text-mute",
};

function OfferForm({
  initial,
  offerId,
  onSaved,
}: {
  initial?: CreateBirthdayOfferRequest;
  offerId?: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateBirthdayOfferRequest>({ ...BLANK, ...initial });
  const [busy, setBusy] = useState(false);
  const allMonths = !form.birthdayMonths?.length;

  async function save() {
    const errors = validateBirthdayOfferDraft({
      ...form,
      birthdayMonths: form.birthdayMonths || [],
    } as unknown as Record<string, unknown>);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setBusy(true);
    try {
      if (offerId) {
        await updateBirthdayOfferRemote({
          offerId,
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
          },
        });
        toast.success("Offer updated.");
      } else {
        const res = await createBirthdayOfferRemote({ ...form, status: "draft" });
        toast.success("Draft created.");
        onSaved();
        window.location.assign(`/business/birthday-offers/${res.offerId}`);
        return;
      }
      onSaved();
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleRegion(code: string) {
    const set = new Set(form.regions);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    setForm({ ...form, regions: Array.from(set) });
  }

  function toggleMonth(m: number) {
    const cur = form.birthdayMonths || [];
    const set = new Set(cur);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    setForm({ ...form, birthdayMonths: Array.from(set).sort((a, b) => a - b) });
  }

  return (
    <div className="mt-4 space-y-3">
      {(
        [
          ["brand", "Brand"],
          ["title", "Title"],
          ["rewardText", "Reward"],
          ["howToClaim", "How to claim"],
          ["claimUrl", "Claim URL (optional)"],
          ["description", "Description (optional)"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">{label}</span>
          <input
            className="mt-1 w-full rounded-2xl bg-card px-3 py-2.5 text-sm ring-1 ring-line"
            value={String(form[key] || "")}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </label>
      ))}

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">Category</span>
        <select
          className="mt-1 w-full rounded-2xl bg-card px-3 py-2.5 text-sm ring-1 ring-line"
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

      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">Regions</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {BIRTHDAY_REGIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => toggleRegion(r.code)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                form.regions.includes(r.code) ? "bg-brand text-white ring-brand" : "bg-card ring-line",
              )}
            >
              {r.flagEmoji} {r.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">Birthday months</span>
          <button
            type="button"
            className="text-[11px] font-bold text-brand"
            onClick={() => setForm({ ...form, birthdayMonths: [] })}
          >
            All months
          </button>
        </div>
        <p className="text-[11px] text-mute">{allMonths ? "Applies to every month." : "Selected months only."}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {BIRTHDAY_MONTHS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => toggleMonth(m.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                !allMonths && form.birthdayMonths?.includes(m.value)
                  ? "bg-brand text-white ring-brand"
                  : "bg-card ring-line",
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.adultOnly !== false}
          onChange={(e) => setForm({ ...form, adultOnly: e.target.checked })}
        />
        Adult 18+ only (default on)
      </label>

      <Button className="w-full" loading={busy} disabled={busy} onClick={() => void save()}>
        {offerId ? "Save changes" : "Create draft"}
      </Button>
      <p className="text-[11px] text-mute">Drafts stay private until an AirPal admin sets them live.</p>
    </div>
  );
}

export function BusinessBirthdayOffersPage() {
  const { user, authReady, requireUser, isAdmin } = useAuth();
  const params = useParams<{ id?: string }>();
  const [loc] = useLocation();
  const isNew = loc.endsWith("/new") || params.id === "new";
  const editId = !isNew && params.id ? params.id : undefined;

  const [rows, setRows] = useState<BirthdayOffer[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!liveBackendEnabled()) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const res = await listBirthdayOffersRemote({ status: isAdmin ? "any" : undefined });
      const mine = (res.offers || []).filter((o) => o.ownerUid === user?.uid || isAdmin);
      mine.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setRows(mine);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    if (!requireUser("Sign in to manage birthday offers.")) {
      setLoading(false);
      return;
    }
    void reload();
  }, [authReady, user?.uid, isAdmin]);

  const editing = useMemo(() => rows.find((r) => r.id === editId), [rows, editId]);

  if (isNew || editId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/business/birthday-offers" className="flex items-center gap-1 text-[13px] font-medium text-mute">
          <ArrowLeft size={14} /> Birthday offers
        </Link>
        <h1 className="font-display mt-4 text-2xl font-bold">{isNew ? "New birthday offer" : "Edit offer"}</h1>
        <OfferForm
          offerId={editId}
          initial={
            editing
              ? {
                  brand: editing.brand,
                  title: editing.title,
                  description: editing.description,
                  rewardText: editing.rewardText,
                  category: editing.category,
                  regions: editing.regions,
                  birthdayMonths: editing.birthdayMonths,
                  howToClaim: editing.howToClaim,
                  claimUrl: editing.claimUrl || "",
                  adultOnly: editing.adultOnly,
                  status: editing.status,
                }
              : undefined
          }
          onSaved={() => void reload()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/business" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Business
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Birthday month offers</h1>
          <p className="mt-0.5 text-sm text-mute">Mate meetup fuel — loyalty freebies by birthday month.</p>
        </div>
        <Link href="/business/birthday-offers/new">
          <Button>
            <Plus size={15} /> New
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <Cake size={32} className="mx-auto text-mute" />
          <p className="font-display mt-2 text-lg font-bold">Add a birthday freebie for your brand</p>
          <p className="mt-1 text-sm text-mute">Draft free. AirPal sets live after a quick check.</p>
          <Link href="/business/birthday-offers/new">
            <Button className="mt-4">Create offer</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((o) => (
            <Link
              key={o.id}
              href={`/business/birthday-offers/${o.id}`}
              className="block rounded-2xl bg-card p-3 ring-1 ring-line"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                    STATUS_TINT[o.status] || STATUS_TINT.draft,
                  )}
                >
                  {o.status}
                </span>
                <span className="text-[11px] text-mute">
                  {o.regions.map((r) => r.toUpperCase()).join(", ")} · {o.category}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {o.brand} — {o.title}
              </p>
              <p className="mt-0.5 text-xs text-mute">{o.rewardText}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
