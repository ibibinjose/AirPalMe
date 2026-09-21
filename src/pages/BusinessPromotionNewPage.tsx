import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { createPromotionRemote, friendlyPromotionError, submitPromotionRemote } from "@/lib/promotions";
import { MECHANIC_TYPES, PROMOTION_CATEGORIES } from "@shared/promotions";
import { PlaceAddressField } from "@/components/forms/PlaceAddressField";

export function BusinessPromotionNewPage() {
  const { requireUser } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    kind: "promotion",
    mechanicType: "discount",
    title: "",
    description: "",
    sponsorName: "",
    category: "Local",
    prizeTitle: "",
    prizeValue: "",
    eligibility: "Open to AirPal.Me members where permitted.",
    entryLimit: 1,
    startAt: "",
    endAt: "",
    termsText: "",
    locationText: "",
  });
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  async function save(submit: boolean) {
    if (!requireUser("Sign in to create a promotion.")) return;
    setBusy(true);
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
        locationText: form.locationText,
      });
      if (submit) {
        await submitPromotionRemote({ promotionId: res.promotionId });
        toast.success("Submitted for AirPal.Me review.");
      } else {
        toast.success("Draft saved.");
      }
      nav(`/business/promotions/${res.promotionId}`);
    } catch (err) {
      toast.error(friendlyPromotionError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/business/promotions" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Your promotions
      </Link>
      <h1 className="font-display mt-4 text-2xl font-bold">New campaign</h1>
      <p className="mt-0.5 text-sm text-mute">
        What value does this create for the customer? Campaigns go live after review — never directly.
      </p>

      <div className="mt-4 space-y-2 rounded-3xl ring-1 ring-line bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">
            Kind
            <select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm"
            >
              <option value="promotion">Promotion</option>
              <option value="giveaway">Giveaway proposal</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Mechanic
            <select
              value={form.mechanicType}
              onChange={(e) => set("mechanicType", e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm"
            >
              {MECHANIC_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        {[
          ["title", "Title"],
          ["sponsorName", "Business name"],
          ["prizeTitle", "Offer / prize title"],
          ["prizeValue", "Value (e.g. 20% off, ₹5,000 approx.)"],
          ["eligibility", "Eligibility"],
        ].map(([k, label]) => (
          <label key={k} className="block text-xs font-semibold">
            {label}
            <input
              value={String(form[k as keyof typeof form])}
              onChange={(e) => set(k, e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
        ))}
        <PlaceAddressField
          label="Location"
          value={form.locationText}
          onChange={(text) => set("locationText", text)}
          placeholder="Search Google Maps"
        />
        <label className="block text-xs font-semibold">
          Description
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">
            Category
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm"
            >
              {PROMOTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Entry limit
            <input
              type="number"
              min={1}
              value={form.entryLimit}
              onChange={(e) => set("entryLimit", Number(e.target.value))}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Starts
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Ends
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
              className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold">
          Terms & redemption rules
          <textarea
            value={form.termsText}
            onChange={(e) => set("termsText", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl ring-1 ring-line/15 p-2 text-sm font-normal"
          />
        </label>
        <div className="flex gap-2">
          <Button onClick={() => save(false)} disabled={busy} className="flex-1 bg-card text-ink ring-1 ring-line">
            {busy ? "Saving…" : "Save draft"}
          </Button>
          <Button
            onClick={() => save(true)}
            disabled={busy || !form.title || !form.startAt || !form.endAt}
            className="flex-1"
          >
            {busy ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
