import { useState } from "react";
import { Link, useLocation } from "wouter";
import { doc, setDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { isValidFestivalSlug, slugifyFestivalName, validateFestival, type Festival } from "@shared/festival";
import { toast } from "sonner";

export function FestivalCreatePage() {
  const [, nav] = useLocation();
  const { user, requireUser } = useAuth();
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("Sydney");
  const [startDate, setStartDate] = useState("2026-09-21");
  const [endDate, setEndDate] = useState("2026-09-27");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugifyFestivalName(value));
  }

  async function create() {
    if (!requireUser("Sign in to create a festival.")) return;
    if (!user || !isFirebaseConfigured) return;
    const problems = validateFestival({ name, slug, city, startDate, endDate });
    setErrors(problems);
    if (problems.length) return;
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const festival: Festival = {
        slug,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        city: city.trim(),
        startDate,
        endDate,
        timeZone: "Australia/Sydney",
        organizerName: organizerName.trim() || user.displayName || undefined,
        status: "draft",
        createdByUid: user.uid,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, "festivals", slug), festival);
      toast.success("Festival created — add sessions, then go live");
      nav(`/f/${slug}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create festival");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <Link href="/explore" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mute">
        <ArrowLeft size={15} /> Explore
      </Link>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">New festival</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink">Put your week on AirPal</h1>
      <p className="mt-2 text-[14px] text-mute">
        A festival is a week-long program: your identity on top, every session attendable, on calendars, and
        connectable to an AirPal. It starts as a draft — only you see it until you go live.
      </p>

      <div className="mt-5 space-y-3 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
        <ValidField label="Festival name" error={errors.find((e) => e.includes("name")) || null}>
          <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Spark Festival 2026" className={fieldInput} maxLength={80} />
        </ValidField>
        <ValidField
          label="URL — airpal.me/f/…"
          hint="Lowercase letters, digits, hyphens."
          ok={slug.length > 0 && isValidFestivalSlug(slug)}
          error={errors.find((e) => e.includes("Slug")) || null}
        >
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugifyFestivalName(e.target.value));
            }}
            placeholder="spark-festival-2026"
            className={fieldInput}
            maxLength={60}
          />
        </ValidField>
        <div className="grid gap-3 sm:grid-cols-3">
          <ValidField label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldInput} maxLength={60} />
          </ValidField>
          <ValidField label="Starts">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldInput} />
          </ValidField>
          <ValidField label="Ends">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldInput} />
          </ValidField>
        </div>
        <ValidField label="Tagline (optional)">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={fieldInput} maxLength={140} />
        </ValidField>
        <ValidField label="About (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={fieldTextarea} maxLength={2000} />
        </ValidField>
        <ValidField label="Organizer (optional)" hint="Defaults to your display name.">
          <input value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} className={fieldInput} maxLength={120} />
        </ValidField>
        {errors.length > 0 && (
          <ul className="rounded-2xl bg-red-50 p-3 text-[13px] text-red-700">
            {errors.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        )}
        <Button onClick={create} loading={busy} disabled={busy} className="w-full">
          Create festival draft
        </Button>
      </div>
    </div>
  );
}
