import { useState } from "react";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput, fieldSelect, fieldTextarea } from "@/components/forms/ValidField";
import { ImageField } from "@/components/media/ImageField";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { eventGatePath, type EventRecord, type Speaker } from "@shared/event";
import { zonedTimeToIso, type Festival, type FestivalStatus } from "@shared/festival";
import { SpeakerPicker } from "@/components/event/SpeakerPicker";
import { toast } from "sonner";

interface Props {
  festival: Festival;
  sessions: EventRecord[];
  onChanged: (next: Festival) => void;
}

function toDateInput(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).formatToParts(new Date(at));
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return "";
  }
}

function toTimeInput(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).formatToParts(
      new Date(at),
    );
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    return `${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

export function FestivalManagePanel({ festival, sessions, onChanged }: Props) {
  const { user } = useAuth();
  const timeZone = festival.timeZone || "Australia/Sydney";
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FestivalStatus>(festival.status);
  const [tagline, setTagline] = useState(festival.tagline || "");
  const [description, setDescription] = useState(festival.description || "");
  const [venueSummary, setVenueSummary] = useState(festival.venueSummary || "");
  const [coverImage, setCoverImage] = useState<string | undefined>(festival.coverImage);
  const [admissionNote, setAdmissionNote] = useState(festival.admissionNote || "");
  const [hostYourEventUrl, setHostYourEventUrl] = useState(festival.hostYourEventUrl || "");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(festival.startDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [venue, setVenue] = useState("");
  const [room, setRoom] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [hostName, setHostName] = useState("");
  const [track, setTrack] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");

  if (!user) return null;
  const db = getFirebaseDb();

  async function saveFestival() {
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const next: Festival = {
        ...festival,
        status,
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        venueSummary: venueSummary.trim() || undefined,
        coverImage,
        admissionNote: admissionNote.trim() || undefined,
        hostYourEventUrl: hostYourEventUrl.trim() || undefined,
        updatedAt: now,
      };
      await setDoc(doc(db, "festivals", festival.slug), next, { merge: true });
      toast.success(status === "live" ? "Festival is live" : "Festival saved");
      onChanged(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save festival");
    } finally {
      setBusy(false);
    }
  }

  function startAdd() {
    setEditingId(null);
    setTitle("");
    setDate(festival.startDate);
    setStartTime("09:00");
    setEndTime("10:00");
    setVenue("");
    setRoom("");
    setSpeakers([]);
    setHostName("");
    setTrack("");
    setSessionDescription("");
    setRegistrationUrl("");
    setShowForm(true);
  }

  function startEdit(session: EventRecord) {
    setEditingId(session.id);
    setTitle(session.name);
    setDate(toDateInput(session.startsAt, timeZone));
    setStartTime(toTimeInput(session.startsAt, timeZone));
    setEndTime(toTimeInput(session.endsAt, timeZone));
    setVenue(session.venue || "");
    setRoom(session.room || "");
    setSpeakers(session.speakers || []);
    setHostName(session.hostName || "");
    setTrack(session.track || "");
    setSessionDescription(session.description || "");
    setRegistrationUrl(session.registrationUrl || "");
    setShowForm(true);
  }

  async function saveSession() {
    if (!db || !user) return;
    const name = title.trim();
    if (!name) {
      toast.error("Session title is required");
      return;
    }
    const startsAt = zonedTimeToIso(date, startTime, timeZone);
    const endsAt = zonedTimeToIso(date, endTime, timeZone);
    if (!startsAt || !endsAt) {
      toast.error("Session date and times are required");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const id = editingId || `evt-${nanoid(8)}`;
      await setDoc(
        doc(db, "events", id),
        {
          id,
          name,
          flavour: "event_space",
          city: festival.city,
          venue: venue.trim() || undefined,
          room: room.trim() || undefined,
          speakers: speakers.length ? speakers : undefined,
          description: sessionDescription.trim() || undefined,
          hostName: hostName.trim() || undefined,
          track: track.trim() || undefined,
          registrationUrl: registrationUrl.trim() || undefined,
          festivalSlug: festival.slug,
          startsAt,
          endsAt,
          status: festival.status === "live" ? "live" : "draft",
          gatePath: eventGatePath(id),
          organiserUid: user.uid,
          categoryChips: [],
          stallCount: 0,
          updatedAt: now,
          ...(editingId ? {} : { createdAt: now }),
        },
        { merge: true },
      );
      toast.success(editingId ? "Session updated" : "Session added");
      setShowForm(false);
      onChanged(festival);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save session");
    } finally {
      setBusy(false);
    }
  }

  async function removeSession(id: string) {
    if (!db) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this session from the program?")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Session removed");
      onChanged(festival);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Manage festival" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
      <h2 className="font-display text-xl font-bold text-ink">Manage festival</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ValidField label="Status" hint="Draft is visible to you only; live is public.">
          <select value={status} onChange={(e) => setStatus(e.target.value as FestivalStatus)} className={fieldSelect}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>
        </ValidField>
        <ValidField label="Tagline">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={fieldInput} maxLength={140} />
        </ValidField>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ValidField label="Venue summary">
          <input value={venueSummary} onChange={(e) => setVenueSummary(e.target.value)} className={fieldInput} maxLength={120} />
        </ValidField>
        <ValidField label="Admission note" hint='e.g. "Every event is free"'>
          <input value={admissionNote} onChange={(e) => setAdmissionNote(e.target.value)} className={fieldInput} maxLength={120} />
        </ValidField>
      </div>
      <div className="mt-3">
        <ValidField label="About the festival">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={fieldTextarea} maxLength={2000} />
        </ValidField>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ValidField label="Host-your-session link">
          <input value={hostYourEventUrl} onChange={(e) => setHostYourEventUrl(e.target.value)} className={fieldInput} inputMode="url" />
        </ValidField>
        <div>
          <span className="text-[12px] font-semibold text-ink/70">Cover image</span>
          <ImageField kind="cover" value={coverImage} folder="listings" onChange={(src) => setCoverImage(src)} />
        </div>
      </div>
      <div className="mt-4">
        <Button size="sm" onClick={saveFestival} loading={busy} disabled={busy}>
          Save festival
        </Button>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Sessions · {sessions.length}</h3>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={startAdd}>
            <Plus size={15} /> Add session
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 ring-1 ring-line/60">
              <span className="min-w-0 truncate text-[13px] text-ink">
                <span className="font-semibold">{s.name}</span>
                <span className="text-mute"> · {toDateInput(s.startsAt, timeZone)} {toTimeInput(s.startsAt, timeZone)}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Edit ${s.name}`} onClick={() => startEdit(s)} className="rounded-full p-2 text-mute ring-1 ring-line">
                  <Pencil size={14} />
                </button>
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => removeSession(s.id)} className="rounded-full p-2 text-mute ring-1 ring-line">
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>

        {showForm && (
          <div className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
            <h4 className="font-display text-[16px] font-bold text-ink">{editingId ? "Edit session" : "Add session"}</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ValidField label="Title">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldInput} maxLength={120} />
                </ValidField>
              </div>
              <ValidField label="Date">
                <input type="date" value={date} min={festival.startDate} max={festival.endDate} onChange={(e) => setDate(e.target.value)} className={fieldInput} />
              </ValidField>
              <div className="grid grid-cols-2 gap-3">
                <ValidField label="Starts">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldInput} />
                </ValidField>
                <ValidField label="Ends">
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={fieldInput} />
                </ValidField>
              </div>
              <ValidField label="Venue">
                <input value={venue} onChange={(e) => setVenue(e.target.value)} className={fieldInput} maxLength={160} />
              </ValidField>
              <ValidField label="Room / hall (optional)">
                <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Boardroom 5+6" className={fieldInput} maxLength={120} />
              </ValidField>
              <div className="sm:col-span-2">
                <SpeakerPicker speakers={speakers} onChange={setSpeakers} />
              </div>
              <ValidField label="Host">
                <input value={hostName} onChange={(e) => setHostName(e.target.value)} className={fieldInput} maxLength={120} />
              </ValidField>
              <ValidField label="Track (optional)">
                <input value={track} onChange={(e) => setTrack(e.target.value)} className={fieldInput} maxLength={60} />
              </ValidField>
              <ValidField label="Registration link (optional)">
                <input value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} className={fieldInput} inputMode="url" />
              </ValidField>
              <div className="sm:col-span-2">
                <ValidField label="Description">
                  <textarea value={sessionDescription} onChange={(e) => setSessionDescription(e.target.value)} className={fieldTextarea} maxLength={2000} />
                </ValidField>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={saveSession} loading={busy} disabled={busy}>
                {editingId ? "Save session" : "Add session"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
