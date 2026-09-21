import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, ContactRound, Plus, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuth } from "@/contexts/AuthContext";
import { downloadVCard, listPeople, removePerson, upsertPerson, type PersonMet } from "@/lib/people";
import { listMemories, memoriesWithPerson } from "@/lib/memories";
import { listMyCatchUpReminders, removeCatchUp, type CatchUpItem } from "@/lib/catchup";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { bioPath } from "@shared/bio";
import { fieldInput } from "@/components/forms/ValidField";
import { PlaceAddressField } from "@/components/forms/PlaceAddressField";

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function PeoplePage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const [activeTab, setActiveTab] = useState<"met" | "catchup">("met");
  const [people, setPeople] = useState<PersonMet[]>(() => listPeople());
  const [catchUps, setCatchUps] = useState<CatchUpItem[]>(() => listMyCatchUpReminders());
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [whereMet, setWhereMet] = useState("");

  if (!authReady) {
    return <PageLoading />;
  }
  if (!user) {
    return (
      <AuthGate
        next="/me/people"
        kicker="Networking"
        title="People you met"
        lede="Sign in to keep everyone you meet on the trip in one place — scan their bio QR or save them here, then find them again in seconds."
      />
    );
  }

  function refresh() {
    setPeople(listPeople());
    setCatchUps(listMyCatchUpReminders());
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Add their name");
      return;
    }
    upsertPerson({ name, handle, whereMet });
    setName("");
    setHandle("");
    setWhereMet("");
    setFormOpen(false);
    refresh();
    toast.success("Saved to people you met");
  }

  function onRemove(id: string, name: string) {
    removePerson(id);
    refresh();
    toast.success(`Removed ${name}`);
  }

  function onRemoveCatchUp(id: string, name: string) {
    removeCatchUp(id);
    refresh();
    toast.success(`Removed catch-up reminder for ${name}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => nav("/me")}
          className="grid h-9 w-9 place-items-center rounded-full bg-card ring-1 ring-line transition hover:bg-card/80"
          aria-label="Back to profile"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Networking</p>
          <h1 className="font-display text-2xl font-bold leading-tight">People you met</h1>
        </div>
        <Button size="sm" className="ml-auto gap-1.5 rounded-full" onClick={() => setFormOpen((v) => !v)}>
          <Plus size={15} />
          Add
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="mt-4 flex rounded-2xl bg-paper p-1 ring-1 ring-line">
        <button
          type="button"
          onClick={() => setActiveTab("met")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "met" ? "bg-card text-ink shadow-xs" : "text-mute hover:text-ink"
          }`}
        >
          <Users size={13} />
          <span>People Met ({people.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("catchup")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "catchup" ? "bg-card text-gold shadow-xs" : "text-mute hover:text-ink"
          }`}
        >
          <Sparkles size={13} />
          <span>Catch Ups ({catchUps.length})</span>
        </button>
      </div>

      {activeTab === "catchup" ? (
        <div className="mt-4">
          {catchUps.length === 0 ? (
            <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
                <Sparkles size={22} />
              </div>
              <p className="font-display mt-3 text-lg font-bold">No catch-up reminders</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-mute">
                Tap <strong>Catch Up</strong> on any bio profile (@username) to save a reminder or sync a meetup to your
                calendar.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {catchUps.map((c) => (
                <li key={c.id} className="rounded-3xl bg-card p-4 ring-1 ring-line">
                  <div className="flex items-center gap-3">
                    {c.requesterPhoto ? (
                      <Photo src={c.requesterPhoto} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/20 font-display text-base font-bold text-gold">
                        {c.requesterName[0]?.toUpperCase() || "@"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{c.requesterName}</p>
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                          Catch Up
                        </span>
                      </div>
                      <p className="text-xs text-mute truncate">
                        {c.targetHandle ? `@${c.targetHandle}` : null} {c.venue ? `· ${c.venue}` : ""}
                      </p>
                    </div>

                    {c.targetHandle && (
                      <button
                        type="button"
                        onClick={() => nav(bioPath(c.targetHandle))}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold ring-1 ring-line hover:bg-card"
                        title="View profile"
                      >
                        @
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveCatchUp(c.id, c.requesterName)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-mute ring-1 ring-line hover:text-red-600"
                      title="Remove reminder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Calendar Sync row for this catchup */}
                  <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between">
                    <p className="text-[11px] text-mute">Sync to calendar:</p>
                    <AddToCalendarMenu
                      size="sm"
                      variant="pill"
                      label="Sync Meetup"
                      event={{
                        title: `Catch up with ${c.requesterName} (@${c.targetHandle})`,
                        description: `Catch up session with ${c.requesterName} organized via AirPal.me (@${c.targetHandle}).\nProfile: https://airpal.me${bioPath(c.targetHandle)}`,
                        startsAt: c.date && c.time ? `${c.date}T${c.time}:00` : new Date().toISOString(),
                        venue: c.venue || "Sydney",
                        city: "Sydney",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {formOpen && (
            <form onSubmit={onAdd} className="mt-4 space-y-2 rounded-3xl bg-card p-4 ring-1 ring-line">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name — Maya"
                maxLength={60}
                className={fieldInput}
              />
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@handle (if they have an AirPal bio)"
                maxLength={40}
                className={fieldInput}
              />
              <PlaceAddressField
                label=""
                value={whereMet}
                onChange={setWhereMet}
                placeholder="Where you met — Bondi markets"
              />
              <Button type="submit" className="w-full rounded-full">
                Save person
              </Button>
            </form>
          )}

          {people.length === 0 && !formOpen ? (
            <div className="mt-8 rounded-3xl bg-card p-8 text-center ring-1 ring-line">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <UserRound size={22} />
              </div>
              <p className="font-display mt-3 text-lg font-bold">Nobody saved yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-mute">
                When you meet someone, scan their bio QR with the Scan tab — or tap Connect on their bio page.
              </p>
              <Button variant="ghost" className="mt-4 rounded-full" onClick={() => nav("/scan")}>
                Open Scan
              </Button>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {people.map((p) => {
                const key = p.handle || p.name;
                const memoryCount = memoriesWithPerson(listMemories(), key).length;
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-3xl bg-card p-3 ring-1 ring-line">
                    {p.photo ? (
                      <Photo src={p.photo} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">
                        {p.name[0]?.toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-mute">
                        {[p.handle ? `@${p.handle}` : null, p.whereMet, formatDay(p.metAt)].filter(Boolean).join(" · ")}
                      </p>
                      {memoryCount > 0 && (
                        <button
                          type="button"
                          onClick={() => nav(`/me/memories?with=${encodeURIComponent(key)}`)}
                          className="mt-0.5 text-xs font-medium text-brand hover:underline"
                        >
                          {memoryCount} {memoryCount === 1 ? "memory" : "memories"} together →
                        </button>
                      )}
                    </div>
                    {p.handle && (
                      <button
                        type="button"
                        onClick={() => nav(bioPath(p.handle!))}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold ring-1 ring-line transition hover:bg-card"
                        aria-label={`Open ${p.name}'s bio`}
                        title="Open bio"
                      >
                        @
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        downloadVCard({
                          name: p.name,
                          url: p.handle ? `https://airpal.me${bioPath(p.handle)}` : undefined,
                          note: p.whereMet ? `Met at ${p.whereMet} · AirPal` : "AirPal contact",
                        })
                      }
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper ring-1 ring-line transition hover:bg-card"
                      aria-label={`Save ${p.name} to contacts`}
                      title="Save contact (.vcf)"
                    >
                      <ContactRound size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(p.id, p.name)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-mute ring-1 ring-line transition hover:text-red-600"
                      aria-label={`Remove ${p.name}`}
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
