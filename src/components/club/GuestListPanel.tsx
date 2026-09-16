import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AIRPAL_CLUB_ID, useClub } from "@/contexts/ClubContext";

export function GuestListPanel({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { guests, addGuest, removeGuest, importClubToList, sendInvite, members } = useClub();
  const rows = guests(clubId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`${clubName} — you're on the list`);
  const [body, setBody] = useState(`Hi,\n\nYou're invited. Show this mail at the door.\n\n${clubName}\nvia AirPal.me`);
  const airpal = clubId === AIRPAL_CLUB_ID;

  function onAdd(e: FormEvent) {
    e.preventDefault();
    try {
      addGuest(clubId, { name, email, source: "manual" });
      setName("");
      setEmail("");
      toast.success("On the list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function onSend() {
    try {
      const emails = airpal
        ? members.filter((m) => m.invites).map((m) => m.email)
        : rows.map((r) => r.email);
      const { href, copied } = sendInvite(clubId, subject, body, emails);
      void navigator.clipboard.writeText(copied).then(
        () => toast.success(`${emails.length} copied. Mail app opening.`),
        () => toast.message(`${emails.length} ready`),
      );
      window.location.href = href;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
        <p className="font-display text-4xl">{airpal ? members.filter((m) => m.invites).length : rows.length}</p>
        <p className="text-sm text-mute">{airpal ? "AirPal Club, invites on" : "On the guest list"}</p>
      </div>

      {!airpal && (
        <form className="space-y-2" onSubmit={onAdd}>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" placeholder="Name" className="h-11 flex-1 rounded-full bg-card px-4 ring-1 ring-line outline-none" />
            <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11 flex-1 rounded-full bg-card px-4 ring-1 ring-line outline-none" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-11">
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11"
              onClick={() => {
                const n = importClubToList(clubId);
                toast.message(n ? `${n} from AirPal Club` : "Already imported");
              }}
            >
              From AirPal Club
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {(airpal ? members.filter((m) => m.invites) : rows).map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <span>
              <span className="block font-medium">{row.name || row.email}</span>
              <span className="text-[12px] text-mute">{row.email}</span>
            </span>
            {!airpal && (
              <button type="button" className="text-sm text-mute" onClick={() => removeGuest(clubId, row.email)}>
                Remove
              </button>
            )}
          </li>
        ))}
        {(airpal ? members.filter((m) => m.invites) : rows).length === 0 && (
          <p className="text-sm text-mute">{airpal ? "Nobody in AirPal Club yet." : "Add a name, or import AirPal Club."}</p>
        )}
      </ul>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Email invite</p>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className="h-32 w-full rounded-2xl bg-card p-4 ring-1 ring-line outline-none" />
        <Button className="w-full" onClick={onSend}>
          Open mail app
        </Button>
        <p className="text-[12px] text-mute">Opens your mail app with the list on BCC. We do not send bulk mail from our servers yet.</p>
      </div>
    </div>
  );
}
