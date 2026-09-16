import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanion } from "@/contexts/CompanionContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import { ChatBox } from "@/components/messaging/ChatBox";
import { cn } from "@/lib/cn";
import {
  MATE_REQUEST_STATUSES,
  isRequestStatus,
  matchAssignmentValid,
  type MateRequest,
  type MateRequestStatus,
} from "@shared/mate-request";
import { DEFAULT_FEE_CONFIG } from "@shared/booking";

function statusPill(status: MateRequestStatus): string {
  switch (status) {
    case "matched":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30";
    case "completed":
      return "bg-paper text-mute ring-line";
    case "cancelled":
      return "bg-red-500/10 text-red-600 ring-red-500/30";
    default:
      return "bg-brand/10 text-brand ring-brand/30";
  }
}

/** Manual matching queue: every Mate request lands here for a human to match. */
export function MateRequestsAdmin() {
  const { user, isAdmin } = useAuth();
  const { allApplications } = useCompanion();
  const [rows, setRows] = useState<MateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MateRequestStatus | "all">("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [matePick, setMatePick] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookingFor, setBookingFor] = useState<Record<string, string>>({});

  async function loadBooking(requestId: string) {
    if (bookingFor[requestId] !== undefined) return;
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const snap = await getDocs(query(collection(db, "bookings"), where("requestId", "==", requestId), limit(5)));
      const first = snap.docs[0];
      setBookingFor((m) => ({
        ...m,
        [requestId]: first ? String((first.data() as { status?: string }).status ?? "unknown") : "none",
      }));
    } catch {
      setBookingFor((m) => ({ ...m, [requestId]: "unavailable" }));
    }
  }

  const approvedMates = useMemo(
    () =>
      allApplications
        .filter((a) => a.status === "approved")
        .map((a) => ({ uid: a.userId, name: a.fullName }))
        .filter((m) => m.uid && m.name)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allApplications],
  );

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "mate_requests"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MateRequest, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  const counts = useMemo(() => {
    const map = new Map<MateRequestStatus, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) || 0) + 1);
    return map;
  }, [rows]);

  async function act(row: MateRequest, status: MateRequestStatus) {
    const db = getFirebaseDb();
    if (!db || !isRequestStatus(status)) return;
    const picked = approvedMates.find((m) => m.uid === matePick);
    if (status === "matched") {
      if (!picked || !matchAssignmentValid(picked.uid, picked.name)) return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const patch: {
        status: MateRequestStatus;
        adminNote: string;
        updatedAt: string;
        matchedMateUid?: string;
        matchedMateName?: string;
        completedAt?: string;
      } = { status, adminNote: note.trim(), updatedAt: now };
      if (status === "matched" && picked) {
        patch.matchedMateUid = picked.uid;
        patch.matchedMateName = picked.name;
      }
      if (status === "completed") patch.completedAt = now;
      await updateDoc(doc(db, "mate_requests", row.id), patch);
      void logAdminAction(
        user?.uid ?? "",
        "mate_request.status",
        "mate_requests",
        row.id,
        row.status,
        picked ? `${status} → ${picked.name}` : status,
        note.trim(),
      );
      setRows((list) =>
        list.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status,
                adminNote: note.trim(),
                updatedAt: now,
                ...(picked ? { matchedMateUid: picked.uid, matchedMateName: picked.name } : {}),
                ...(status === "completed" ? { completedAt: now } : {}),
              }
            : r,
        ),
      );
      setNote("");
      setMatePick("");
      setOpenId(null);
    } finally {
      setBusy(false);
    }
  }

  const [feeBps, setFeeBps] = useState(String(DEFAULT_FEE_CONFIG.platformFeeBps));
  const [minFee, setMinFee] = useState(String(DEFAULT_FEE_CONFIG.minimumPlatformFeeCents));
  const [feeBusy, setFeeBusy] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isAdmin) return;
    void getDoc(doc(db, "platform_settings", "marketplace")).then((snap) => {
      if (!snap.exists()) return;
      const row = snap.data() as { platformFeeBps?: number; minimumPlatformFeeCents?: number };
      if (row.platformFeeBps != null) setFeeBps(String(row.platformFeeBps));
      if (row.minimumPlatformFeeCents != null) setMinFee(String(row.minimumPlatformFeeCents));
    });
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Marketplace · matching & fees</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Mate requests</h2>
      <p className="mt-1 text-sm text-mute">
        Approved Mates can accept from /mate. This queue is the backup — match by hand when needed.
      </p>
      <form
        className="mt-3 grid gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const db = getFirebaseDb();
          if (!db || !user) return;
          const platformFeeBps = Math.max(0, Math.min(5000, Math.floor(Number(feeBps) || 0)));
          const minimumPlatformFeeCents = Math.max(0, Math.floor(Number(minFee) || 0));
          setFeeBusy(true);
          void setDoc(doc(db, "platform_settings", "marketplace"), {
            platformFeeBps,
            minimumPlatformFeeCents,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid,
          })
            .then(() => {
              setFeeBps(String(platformFeeBps));
              setMinFee(String(minimumPlatformFeeCents));
              void logAdminAction(user.uid, "fees.update", "platform_settings", "marketplace", "", `${platformFeeBps}bps`);
            })
            .finally(() => setFeeBusy(false));
        }}
      >
        <label className="text-[12px] font-medium text-mute">
          Platform fee (bps)
          <input
            value={feeBps}
            onChange={(e) => setFeeBps(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-ink bg-card px-3 py-2 text-sm text-ink focus:border-brand"
          />
        </label>
        <label className="text-[12px] font-medium text-mute">
          Minimum fee (cents)
          <input
            value={minFee}
            onChange={(e) => setMinFee(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-ink bg-card px-3 py-2 text-sm text-ink focus:border-brand"
          />
        </label>
        <Button size="sm" className="self-end" disabled={feeBusy} loading={feeBusy}>
          Save fees
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["all", ...MATE_REQUEST_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1",
              filter === s ? "bg-ink text-white ring-ink" : "bg-paper text-mute ring-line",
            )}
          >
            {s === "all" ? `All (${rows.length})` : `${s} (${counts.get(s) || 0})`}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-mute">Loading requests…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-mute">
          No {filter === "all" ? "" : `${filter} `}requests. The first 100 transactions start here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl bg-paper p-3 ring-1 ring-line">
              <button
                onClick={() => {
                  setOpenId(openId === r.id ? null : r.id);
                  void loadBooking(r.id);
                }}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.what}</span>
                  <span className="block text-xs text-mute">
                    {r.suburb} · {r.date} · {r.partySize} people · ${r.budget}
                  </span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", statusPill(r.status))}>
                  {r.status}
                </span>
              </button>
              {openId === r.id && (
                <div className="mt-2 border-t border-line pt-2 text-[13px]">
                  <p className="text-mute">
                    Use case: {r.useCase} · Mate kind: {r.mateKind || "any"} · Time: {r.time || "flexible"}
                  </p>
                  {r.matchedMateName && (
                    <p className="mt-1 font-semibold">Delivering: {r.matchedMateName}</p>
                  )}
                  {bookingFor[r.id] && bookingFor[r.id] !== "none" && (
                    <p className="mt-1 text-mute">Booking: {bookingFor[r.id]} (pay later — Stripe pending)</p>
                  )}
                  {r.adminNote && <p className="mt-1">Note: {r.adminNote}</p>}
                  {(r.status === "matched" || r.status === "completed") && (
                    <div className="mt-2">
                      <p className="mb-1 text-xs font-semibold text-mute">Conversation transcript (read-only)</p>
                      <ChatBox requestId={r.id} readOnly />
                    </div>
                  )}
                  <label className="mt-2 block">
                    <span className="text-xs font-semibold text-mute">Assign an approved Mate</span>
                    <select
                      value={matePick}
                      onChange={(e) => setMatePick(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-ink bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      <option value="">Select a Mate…</option>
                      {approvedMates.map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {approvedMates.length === 0 && (
                    <p className="mt-1 text-xs text-mute">No approved Mates yet — approve applications first.</p>
                  )}
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Matching note (e.g. offered to Ava, awaiting reply)"
                    className="mt-2 w-full rounded-xl border border-ink bg-card px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {MATE_REQUEST_STATUSES.filter((s) => s !== r.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        disabled={busy || (s === "matched" && !matePick)}
                        onClick={() => void act(r, s)}
                      >
                        {s === "matched" ? "Match Mate" : `Mark ${s}`}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
