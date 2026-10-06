import { useEffect, useState } from "react";
import { AtSign, Plus, X } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { fetchPublicBio } from "@/lib/bio-store";
import { normalizeSpeakerHandle, type Speaker } from "@shared/event";

interface Props {
  speakers: Speaker[];
  onChange: (next: Speaker[]) => void;
}

/**
 * Add speakers and panel members — as many as the session needs. Type an
 * AirPal @handle to pull the member's live name + profile photo, or add an
 * external guest by name. Photos resolve on the program automatically.
 */
export function SpeakerPicker({ speakers, onChange }: Props) {
  const [handleInput, setHandleInput] = useState("");
  const [lookedUp, setLookedUp] = useState<{ handle: string; name: string; photoUrl?: string } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMiss, setLookupMiss] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState("");

  const input =
    "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60";

  async function lookup(handleRaw: string) {
    const handle = normalizeSpeakerHandle(handleRaw);
    setLookupMiss(false);
    if (!handle) {
      setLookedUp(null);
      return;
    }
    if (speakers.some((s) => s.handle === handle)) {
      setLookedUp(null);
      return;
    }
    setLookupBusy(true);
    try {
      const bio = await fetchPublicBio(handle).catch(() => null);
      if (bio) {
        setLookedUp({ handle, name: bio.name || `@${handle}`, photoUrl: bio.avatar });
      } else {
        setLookedUp(null);
        setLookupMiss(true);
      }
    } finally {
      setLookupBusy(false);
    }
  }

  function addMember(member: Speaker) {
    if (speakers.length >= 24) return;
    if (member.handle && speakers.some((s) => s.handle === member.handle)) return;
    onChange([...speakers, member]);
  }

  function removeMember(idx: number) {
    onChange(speakers.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
        Speakers & panel members {speakers.length > 0 && `· ${speakers.length}`}
      </label>

      {speakers.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {speakers.map((s, i) => (
            <SpeakerPickerRow
              key={`${s.handle || s.name}-${i}`}
              speaker={s}
              onRemove={() => removeMember(i)}
            />
          ))}
        </ul>
      )}

      <div className="rounded-2xl bg-paper p-3 ring-1 ring-line/70 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
            <input
              value={handleInput}
              onChange={(e) => {
                setHandleInput(e.target.value.replace(/^@+/, ""));
                setLookupMiss(false);
              }}
              onBlur={() => lookup(handleInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup(handleInput);
                }
              }}
              placeholder="AirPal member handle"
              className={`${input} pl-8`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (lookedUp) {
                addMember({ name: lookedUp.name, handle: lookedUp.handle });
                setHandleInput("");
                setLookedUp(null);
              } else {
                lookup(handleInput);
              }
            }}
            disabled={!handleInput.trim() || lookupBusy}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20 disabled:opacity-40"
            aria-label="Add member"
          >
            <Plus size={18} />
          </button>
        </div>

        {lookupBusy && <p className="text-[12px] text-mute">Looking up member…</p>}
        {lookupMiss && (
          <p className="text-[12px] text-mute">
            No AirPal profile for @{normalizeSpeakerHandle(handleInput)} — add them as a guest below, or check the
            spelling.
          </p>
        )}
        {lookedUp && (
          <button
            type="button"
            onClick={() => {
              addMember({ name: lookedUp.name, handle: lookedUp.handle });
              setHandleInput("");
              setLookedUp(null);
            }}
            className="flex w-full items-center gap-2 rounded-2xl bg-card px-3 py-2 text-left ring-1 ring-brand/30"
          >
            {lookedUp.photoUrl ? (
              <Photo src={lookedUp.photoUrl} alt={lookedUp.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-line" />
            ) : (
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-[13px] font-bold text-accent">
                {lookedUp.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 text-[13px]">
              <span className="font-semibold text-ink">{lookedUp.name}</span>
              <span className="text-accent"> @{lookedUp.handle}</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
              <Plus size={14} /> Add
            </span>
          </button>
        )}

        <div className="flex gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && guestName.trim()) {
                e.preventDefault();
                addMember({ name: guestName.trim().slice(0, 80), role: guestRole.trim().slice(0, 120) || undefined });
                setGuestName("");
                setGuestRole("");
              }
            }}
            placeholder="External guest name"
            maxLength={80}
            className={`${input} flex-1`}
          />
          <input
            value={guestRole}
            onChange={(e) => setGuestRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && guestName.trim()) {
                e.preventDefault();
                addMember({ name: guestName.trim().slice(0, 80), role: guestRole.trim().slice(0, 120) || undefined });
                setGuestName("");
                setGuestRole("");
              }
            }}
            placeholder="Role (optional)"
            maxLength={120}
            className={`${input} flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              if (!guestName.trim()) return;
              addMember({ name: guestName.trim().slice(0, 80), role: guestRole.trim().slice(0, 120) || undefined });
              setGuestName("");
              setGuestRole("");
            }}
            disabled={!guestName.trim()}
            aria-label="Add guest"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20 disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SpeakerPickerRow({ speaker, onRemove }: { speaker: Speaker; onRemove?: () => void }) {
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!speaker.handle) return;
    let cancelled = false;
    void fetchPublicBio(speaker.handle)
      .then((bio) => {
        if (cancelled) return;
        setPhoto(bio?.avatar || null);
        setName(bio?.name || undefined);
      })
      .catch(() => {
        if (!cancelled) setPhoto(null);
      });
    return () => {
      cancelled = true;
    };
  }, [speaker.handle]);

  return (
    <li className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 text-[13px] ring-1 ring-line/60">
      {photo ? (
        <Photo src={photo} alt={name || speaker.name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
      ) : (
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[13px] font-bold text-accent">
          {(name || speaker.name).trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-ink">
        <span className="font-semibold">{name || speaker.name}</span>
        {speaker.role && <span className="text-mute"> · {speaker.role}</span>}
        {speaker.handle && (
          <span className="inline-flex items-center gap-0.5 text-accent">
            {" "}
            <AtSign size={11} />
            {speaker.handle}
          </span>
        )}
      </span>
      {onRemove && (
        <button type="button" aria-label={`Remove ${speaker.name}`} onClick={onRemove} className="relative rounded-full p-1.5 text-mute hover:text-rose-700 after:absolute after:-inset-3 after:content-[''] cursor-pointer">
          <X size={14} />
        </button>
      )}
    </li>
  );
}
