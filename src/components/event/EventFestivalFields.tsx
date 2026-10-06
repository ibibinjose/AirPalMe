import { Link } from "wouter";
import { isValidFestivalSlug } from "@shared/festival";
import type { Speaker } from "@shared/event";
import { SpeakerPicker } from "./SpeakerPicker";

export interface FestivalFieldValues {
  festivalSlug: string;
  track: string;
  registrationUrl: string;
  registrationNote: string;
  speakers: Speaker[];
}

interface Props {
  values: FestivalFieldValues;
  onChange: (next: FestivalFieldValues) => void;
}

/**
 * Festival program fields shared by the /event create form and the
 * settings form. Attaching is permission-checked server-side: only the
 * festival organiser (or an admin) may pull an event into a program.
 */
export function EventFestivalFields({ values, onChange }: Props) {
  const set = (patch: Partial<FestivalFieldValues>) => onChange({ ...values, ...patch });

  const slug = values.festivalSlug.trim().toLowerCase();
  const slugState = !slug ? "empty" : isValidFestivalSlug(slug) ? "ok" : "bad";

  const input =
    "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60";

  return (
    <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Festival program (optional)</p>
        {slug && slugState === "ok" && (
          <Link href={`/f/${slug}`} className="text-[11px] font-semibold text-accent hover:underline">
            View program
          </Link>
        )}
      </div>
      <p className="text-xs text-mute leading-relaxed">
        Attach this event as a session on a festival week. Only the festival organiser can approve the listing —
        anyone else sees an error on save.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            Festival slug
          </label>
          <input
            value={values.festivalSlug}
            onChange={(e) => set({ festivalSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="e.g. spark-festival-2026"
            className={input}
          />
          {slugState === "bad" && <p className="mt-1 text-[12px] text-red-600">Lowercase letters, digits, hyphens.</p>}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            Program track
          </label>
          <input
            value={values.track}
            onChange={(e) => set({ track: e.target.value })}
            placeholder="e.g. Hackathon, Main stage"
            maxLength={60}
            className={input}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            Registration link
          </label>
          <input
            value={values.registrationUrl}
            onChange={(e) => set({ registrationUrl: e.target.value })}
            placeholder="https://…"
            inputMode="url"
            className={input}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            Registration note
          </label>
          <input
            value={values.registrationNote}
            onChange={(e) => set({ registrationNote: e.target.value })}
            placeholder="e.g. Free, but please book"
            maxLength={120}
            className={input}
          />
        </div>
      </div>

      <SpeakerPicker speakers={values.speakers} onChange={(speakers) => set({ speakers })} />
    </div>
  );
}
