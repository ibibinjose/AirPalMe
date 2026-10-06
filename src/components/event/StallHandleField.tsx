import { useState } from "react";
import { AtSign, Plus } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { fetchPublicBio } from "@/lib/bio-store";
import { normalizeSpeakerHandle } from "@shared/event";

interface Props {
  value: string;
  onChange: (handle: string) => void;
  /** Offer the looked-up bio name when the stall name field is empty. */
  onAutofillName?: (name: string) => void;
}

/**
 * Organizer @handle field for stalls. Exact handle lookup against public
 * bios (the handles index is not listable, so there is no typeahead) with
 * a photo preview and one-tap name fill from the linked profile.
 */
export function StallHandleField({ value, onChange, onAutofillName }: Props) {
  const [preview, setPreview] = useState<{ handle: string; name: string; photoUrl?: string } | null>(null);
  const [miss, setMiss] = useState(false);
  const [busy, setBusy] = useState(false);

  async function lookup(raw: string) {
    const handle = normalizeSpeakerHandle(raw);
    setMiss(false);
    if (!handle) {
      setPreview(null);
      return;
    }
    setBusy(true);
    try {
      const bio = await fetchPublicBio(handle).catch(() => null);
      if (bio) {
        setPreview({ handle, name: bio.name || `@${handle}`, photoUrl: bio.avatar });
      } else {
        setPreview(null);
        setMiss(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
        AirPal @handle (Optional)
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/^@+/, ""));
            setMiss(false);
          }}
          onBlur={() => lookup(value)}
          placeholder="stall_handle"
          className="h-12 w-full rounded-2xl border border-line bg-paper pl-8 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
        />
      </div>
      {busy && <p className="mt-1 text-[12px] text-mute">Looking up profile…</p>}
      {miss && value.trim() && (
        <p className="mt-1 text-[12px] text-mute">No AirPal profile for @{normalizeSpeakerHandle(value)} — the stall still saves with this handle.</p>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => {
            onAutofillName?.(preview.name);
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-2xl bg-card px-3 py-2 text-left ring-1 ring-brand/30"
          title="Fill stall name from this profile"
        >
          {preview.photoUrl ? (
            <Photo src={preview.photoUrl} alt={preview.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-line" />
          ) : (
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-[13px] font-bold text-accent">
              {preview.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="font-semibold text-ink">{preview.name}</span>
            <span className="inline-flex items-center gap-0.5 text-accent">
              {" "}
              <AtSign size={11} />
              {preview.handle}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent">
            <Plus size={14} /> Use name
          </span>
        </button>
      )}
    </div>
  );
}
