import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, BadgeCheck, Check, Minus, Plus, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { TabPills } from "@/components/ui/TabPills";
import { SearchBar } from "@/components/search/SearchBar";
import { NotFoundPage } from "./NotFoundPage";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { checkInGuestRemote, closeGuestlistRemote, listDoorTeamRemote } from "@/lib/functions";
import {
  addDoorGuest,
  addEventCoHost,
  canManageGuestlist,
  fetchListHeader,
  guestStatusLabel,
  removeEventCoHost,
  resolveHandleOwner,
  setEventCapacity,
  subscribeGuestlist,
  type GuestRow,
  type ListHeader,
} from "@/lib/guestlist";
import { summarizeGuestlist, type GuestScope, type GuestStatus } from "@shared/guestlist";

type Filter = "all" | "going" | "checked-in" | "no-show";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "going", label: "Going" },
  { id: "checked-in", label: "Checked in" },
  { id: "no-show", label: "No-show" },
];

const ROW_CAP = 100;

const STATUS_PILL: Record<GuestStatus, string> = {
  going: "bg-brand/10 text-brand ring-brand/25",
  invited: "bg-brand/10 text-brand ring-brand/25",
  "checked-in": "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  "no-show": "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  cancelled: "bg-ink/5 text-mute ring-line",
};

function StatusPill({ status }: { status: GuestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
        STATUS_PILL[status],
      )}
    >
      {guestStatusLabel(status)}
    </span>
  );
}

interface DoorMember {
  uid: string;
  name: string;
  handle?: string;
  owner: boolean;
}

export function GuestlistPage() {
  const [, eventParams] = useRoute("/e/:id/guests");
  const [, planParams] = useRoute("/plan/:id/guests");
  const scope: GuestScope | null = eventParams?.id ? "event" : planParams?.id ? "plan" : null;
  const id = eventParams?.id || planParams?.id || "";
  const { user, isAdmin } = useAuth();

  const [header, setHeader] = useState<ListHeader | null>(null);
  const [headerDone, setHeaderDone] = useState(false);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParty, setAddParty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [capDraft, setCapDraft] = useState("");
  const [capSaving, setCapSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeArmed, setCloseArmed] = useState(false);
  const [team, setTeam] = useState<DoorMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [handleDraft, setHandleDraft] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);

  useEffect(() => {
    setHeader(null);
    setHeaderDone(false);
    if (!scope || !id || !user) return;
    let alive = true;
    void fetchListHeader(scope, id)
      .then((next) => {
        if (alive) setHeader(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setHeaderDone(true);
      });
    return () => {
      alive = false;
    };
  }, [scope, id, user]);

  useEffect(() => {
    if (!scope || !id || !user || !header) return;
    if (!canManageGuestlist(header, user.uid, isAdmin)) return;
    setListLoading(true);
    setListError("");
    return subscribeGuestlist(
      scope,
      id,
      (next) => {
        setRows(next);
        setListLoading(false);
      },
      () => {
        setListError("Couldn't load the guestlist. Check your connection and try again.");
        setListLoading(false);
      },
    );
  }, [scope, id, user, header, isAdmin]);

  useEffect(() => {
    if (!scope || !id || !user || !header) return;
    if (!canManageGuestlist(header, user.uid, isAdmin)) return;
    let alive = true;
    setTeamLoading(true);
    void listDoorTeamRemote({ scope, id })
      .then((res) => {
        if (alive) setTeam(res.members);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setTeamLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [scope, id, user, header, isAdmin]);

  async function reloadTeam() {
    if (!scope || !id) return;
    try {
      const res = await listDoorTeamRemote({ scope, id });
      setTeam(res.members);
    } catch {
      /* keep the last roster on refresh failures */
    }
  }

  const counts = useMemo(() => summarizeGuestlist(rows), [rows]);
  const manages = canManageGuestlist(header, user?.uid, isAdmin);
  const owns = Boolean(header && user && (header.ownerUid === user.uid || isAdmin));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === "going" && !(r.status === "going" || r.status === "invited")) return false;
        if (filter === "checked-in" && r.status !== "checked-in") return false;
        if (filter === "no-show" && r.status !== "no-show") return false;
        if (!q) return true;
        return `${r.name} ${r.handle || ""} ${r.note || ""}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, filter, query]);

  const visible = showAll ? filtered : filtered.slice(0, ROW_CAP);

  if (!user || !scope) {
    return (
      <AuthGate
        next={scope ? `/${scope === "event" ? "e" : "plan"}/${id}/guests` : "/"}
        kicker="Door team"
        title="Guestlist"
        lede="Sign in to manage this guestlist."
      />
    );
  }
  if (!headerDone || !header) {
    if (!headerDone) return <PageLoading />;
    return <NotFoundPage />;
  }
  if (!manages) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Users size={28} aria-hidden className="mx-auto text-mute" />
        <h1 className="font-display mt-3 text-2xl font-bold">Door team only</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          The guestlist is only visible to the {scope === "event" ? "event organiser" : "plan host"} and co-hosts. If
          this is yours, sign in with the host account.
        </p>
        <Link href={header.backHref} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to {scope === "event" ? "the event" : "the plan"}
        </Link>
      </div>
    );
  }

  async function onCheckIn(row: GuestRow) {
    if (checkingId || !user || !scope) return;
    setCheckingId(row.id);
    try {
      const res = await checkInGuestRemote({ scope, id, entryId: row.id });
      void triggerHaptic(res.already ? "light" : "medium");
      toast.success(res.already ? `${row.name} is already checked in.` : `${row.name} checked in.`);
    } catch {
      toast.error("Couldn't check in right now. Try again.");
    } finally {
      setCheckingId(null);
    }
  }

  async function onAddDoor() {
    if (adding || !user || !scope) return;
    if (!addName.trim()) {
      toast.error("Add a guest name to put them on the list.");
      return;
    }
    setAdding(true);
    try {
      await addDoorGuest(scope, id, user.uid, { name: addName, partySize: addParty });
      void triggerHaptic("light");
      toast.success(`${addName.trim()} is on the list.`);
      setAddName("");
      setAddParty(1);
      setAddOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the guest. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function onSaveCapacity() {
    if (capSaving || scope !== "event") return;
    const next = Number.parseInt(capDraft, 10);
    setCapSaving(true);
    try {
      await setEventCapacity(id, next);
      toast.success("Capacity updated.");
      setCapDraft("");
      setHeader((h) => (h ? { ...h, capacity: next } : h));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save capacity.");
    } finally {
      setCapSaving(false);
    }
  }

  async function onClose() {
    if (!closeArmed) {
      setCloseArmed(true);
      return;
    }
    if (closing || !scope) return;
    setClosing(true);
    try {
      const res = await closeGuestlistRemote({ scope, id });
      void triggerHaptic("medium");
      toast.success(
        res.closed === 0
          ? "List closed — everyone showed."
          : `List closed — ${res.closed} no-show${res.closed === 1 ? "" : "s"}.`,
      );
      setCloseArmed(false);
    } catch {
      toast.error("Couldn't close the list. Try again.");
    } finally {
      setClosing(false);
    }
  }

  async function onAddCoHost() {
    if (teamBusy || scope !== "event" || !header) return;
    setTeamBusy(true);
    try {
      const resolved = await resolveHandleOwner(handleDraft);
      if (resolved.uid === header.ownerUid) {
        toast.error("That's already the organiser.");
        return;
      }
      await addEventCoHost(id, resolved.uid, header.coHostUids);
      setHeader((h) => (h ? { ...h, coHostUids: [...h.coHostUids, resolved.uid] } : h));
      setHandleDraft("");
      void triggerHaptic("light");
      toast.success(`@${resolved.handle} joined the door team.`);
      await reloadTeam();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the co-host.");
    } finally {
      setTeamBusy(false);
    }
  }

  async function onRemoveCoHost(member: DoorMember) {
    if (teamBusy || scope !== "event") return;
    setTeamBusy(true);
    try {
      await removeEventCoHost(id, member.uid);
      setHeader((h) => (h ? { ...h, coHostUids: h.coHostUids.filter((v) => v !== member.uid) } : h));
      toast.success(`${member.name} left the door team.`);
      await reloadTeam();
    } catch {
      toast.error("Couldn't remove the co-host.");
    } finally {
      setTeamBusy(false);
    }
  }

  const capacity = header.capacity;
  const goingPct = capacity ? Math.min(100, Math.round((counts.goingHeads / capacity) * 100)) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:px-6">
      <Link
        href={header.backHref}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft size={16} aria-hidden /> {header.title}
      </Link>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Guestlist</h1>
      <p className="mt-1 text-sm text-mute">
        {counts.listedHeads} on the list · updates live as guests RSVP, buy, and scan in.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Going", value: counts.goingHeads },
          { label: "Checked in", value: counts.checkedInHeads },
          { label: "No-show", value: counts.noshowHeads },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-card p-3 text-center ring-1 ring-line shadow-xs">
            <p className="font-display text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{c.label}</p>
          </div>
        ))}
      </div>

      {scope === "event" && (
        <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Capacity <span className="text-mute">{capacity ? `${counts.goingHeads} / ${capacity}` : "not set"}</span>
            </p>
            {goingPct !== null && <p className="text-sm font-bold tabular-nums text-brand">{goingPct}%</p>}
          </div>
          {goingPct !== null && (
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-valuenow={goingPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Capacity filled"
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${goingPct}%` }} />
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <label htmlFor="guestlist-capacity" className="sr-only">
              Set capacity
            </label>
            <input
              id="guestlist-capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={capDraft}
              onChange={(e) => setCapDraft(e.target.value)}
              placeholder={capacity ? String(capacity) : "e.g. 120"}
              className="h-11 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[16px] text-ink ring-1 ring-line"
            />
            <Button size="sm" onClick={onSaveCapacity} disabled={capSaving || !capDraft.trim()} className="h-11">
              {capSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <SearchBar
          value={query}
          onChange={(v) => setQuery(v)}
          onClear={() => setQuery("")}
          placeholder="Search guests…"
          aria-label="Search guests"
        />
        <TabPills
          items={FILTERS.map((f) => ({ id: f.id, label: f.label }))}
          active={filter}
          onChange={(next) => {
            setFilter(next);
            setShowAll(false);
          }}
          ariaLabel="Filter guests"
        />
      </div>

      <div className="mt-4">
        <Button variant="tonal" onClick={() => setAddOpen((v) => !v)} className="h-11 w-full" aria-expanded={addOpen}>
          <UserPlus size={16} className="mr-2" aria-hidden />
          {addOpen ? "Close walk-in form" : "Add a walk-in at the door"}
        </Button>
        {addOpen && (
          <div className="mt-2 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
            <label htmlFor="door-name" className="text-sm font-semibold">
              Guest name
            </label>
            <input
              id="door-name"
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Name on the list"
              maxLength={80}
              autoComplete="off"
              className="mt-1 h-11 w-full rounded-xl bg-paper px-3 text-[16px] text-ink ring-1 ring-line"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Party size</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Fewer guests"
                  onClick={() => setAddParty((p) => Math.max(1, p - 1))}
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-paper ring-1 ring-line active:scale-95"
                >
                  <Minus size={16} aria-hidden />
                </button>
                <span className="min-w-6 text-center text-lg font-bold tabular-nums" aria-live="polite">
                  {addParty}
                </span>
                <button
                  type="button"
                  aria-label="More guests"
                  onClick={() => setAddParty((p) => Math.min(20, p + 1))}
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-paper ring-1 ring-line active:scale-95"
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
            </div>
            <Button onClick={onAddDoor} disabled={adding} className="mt-4 h-11 w-full">
              {adding ? "Adding…" : "Add to the list"}
            </Button>
          </div>
        )}
      </div>

      <section aria-label="Guests" className="mt-4">
        {listLoading ? (
          <PageLoading />
        ) : listError ? (
          <p role="alert" className="rounded-2xl bg-card p-5 text-center text-sm text-mute ring-1 ring-line">
            {listError}
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-line">
            <Search size={22} aria-hidden className="mx-auto text-mute" />
            <p className="mt-2 text-sm font-semibold">No guests match.</p>
            <p className="mt-1 text-sm text-mute">
              {rows.length === 0
                ? "RSVPs and ticket buyers land here automatically."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card ring-1 ring-line shadow-xs">
            {visible.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold">{row.name}</span>
                    {row.verified && <BadgeCheck size={15} aria-label="Verified" className="shrink-0 text-brand" />}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">
                    {row.handle && <span className="truncate">@{row.handle}</span>}
                    <span>
                      {row.partySize} {row.partySize === 1 ? "guest" : "guests"}
                    </span>
                    <StatusPill status={row.status} />
                  </p>
                  {row.note && <p className="mt-0.5 truncate text-[13px] text-mute">“{row.note}”</p>}
                </div>
                {row.status === "checked-in" ? (
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25">
                    <Check size={18} aria-label="Checked in" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onCheckIn(row)}
                    disabled={checkingId !== null}
                    className="h-11 shrink-0 cursor-pointer rounded-full bg-brand px-4 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-60"
                  >
                    {checkingId === row.id ? "…" : "Check in"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!listLoading && !listError && filtered.length > ROW_CAP && (
          <Button variant="ghost" onClick={() => setShowAll((v) => !v)} className="mt-2 h-11 w-full">
            {showAll ? "Show fewer" : `Show all ${filtered.length} guests`}
          </Button>
        )}
      </section>

      <section aria-label="Door team" className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line">
        <h2 className="text-[15px] font-bold">Door team</h2>
        <p className="mt-1 text-sm leading-6 text-mute">
          {scope === "event"
            ? "Co-hosts check guests in and see this list. Only the organiser can change the team."
            : "Co-hosts check guests in and see this list. Manage them from the plan page."}
        </p>
        {teamLoading ? (
          <p className="mt-3 text-sm text-mute">Loading team…</p>
        ) : team.length > 0 ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
            {team.map((m) => (
              <li key={m.uid} className="flex items-center gap-3 bg-paper px-4 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold uppercase ring-1 ring-line">
                  {m.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-[13px] text-mute">
                    {m.handle ? `@${m.handle} · ` : ""}
                    {m.owner ? "Organiser" : "Co-host"}
                  </span>
                </span>
                {owns && !m.owner && scope === "event" && (
                  <button
                    type="button"
                    onClick={() => void onRemoveCoHost(m)}
                    disabled={teamBusy}
                    aria-label={`Remove ${m.name} from the door team`}
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full px-4 text-xs font-semibold text-mute ring-1 ring-line transition hover:text-ink active:scale-95 disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mute">Just you on the door so far.</p>
        )}
        {owns && scope === "event" && (
          <div className="mt-3 flex gap-2">
            <label htmlFor="door-team-handle" className="sr-only">
              Add co-host by handle
            </label>
            <input
              id="door-team-handle"
              type="text"
              value={handleDraft}
              onChange={(e) => setHandleDraft(e.target.value)}
              placeholder="@handle"
              maxLength={31}
              autoComplete="off"
              autoCapitalize="none"
              className="h-11 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[16px] text-ink ring-1 ring-line"
            />
            <Button size="sm" onClick={onAddCoHost} disabled={teamBusy || !handleDraft.trim()} className="h-11">
              {teamBusy ? "Adding…" : "Add"}
            </Button>
          </div>
        )}
        {scope === "plan" && (
          <Link href={header.backHref} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
            Manage co-hosts on the plan page
          </Link>
        )}
      </section>

      <section aria-label="Close the list" className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line">
        <h2 className="text-[15px] font-bold">After doors</h2>
        <p className="mt-1 text-sm leading-6 text-mute">
          Closing marks everyone still going as a no-show. Checked-in guests are untouched, and the counts stay for your
          records.
        </p>
        <Button
          variant={closeArmed ? "dark" : "tonal"}
          onClick={onClose}
          disabled={closing}
          className="mt-3 h-11 w-full"
        >
          {closing ? "Closing…" : closeArmed ? "Tap again to confirm" : "Close the list"}
        </Button>
      </section>
    </div>
  );
}
