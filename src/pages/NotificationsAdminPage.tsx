import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { ArrowLeft, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { liveBackendEnabled } from "@/lib/functions";
import { createBroadcastRemote, reviewBroadcastRemote } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import type { Broadcast } from "@shared/notifications";

export function NotificationsAdminPage() {
  const { isAdmin, authReady } = useAuth();
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [rows, setRows] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("/");

  async function reload() {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(query(collection(db, "broadcasts"), orderBy("createdAt", "desc")));
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Broadcast, "id">) })));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (locked) return;
    void reload();
  }, [locked]);

  if (!authReady || loading)
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-mute">Loading…</p>;
  if (locked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl font-bold">Restricted</p>
        <Link href="/admin">
          <Button className="mt-4">Back</Button>
        </Link>
      </div>
    );
  }

  const queue = rows.filter((r) => r.status === "submitted");
  const history = rows.filter((r) => r.status !== "submitted");

  async function compose() {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy("compose");
    try {
      await createBroadcastRemote({
        title: title.trim().slice(0, 80),
        body: body.trim(),
        href: href.trim() || "/",
        audience: "everyone",
      });
      toast.success("Queued for review — approve below to send to every inbox.");
      setTitle("");
      setBody("");
      setHref("/");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setBusy(null);
    }
  }

  async function review(b: Broadcast, decision: "approve" | "reject") {
    const reason = decision === "reject" ? window.prompt("Reason (the creator sees this):") || "" : "";
    setBusy(b.id + decision);
    try {
      const res = await reviewBroadcastRemote({ broadcastId: b.id, decision, reason });
      toast.success(decision === "approve" ? `Sent to ${res.sent || 0} inboxes.` : "Rejected.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Admin
      </Link>
      <h1 className="font-display mt-4 flex items-center gap-2 text-2xl font-bold">
        <Megaphone size={22} /> Broadcasts
      </h1>
      <p className="mt-0.5 text-sm text-mute">
        Creator messages send only after approval. Transactional mail (entries, wins, reviews) never waits.
      </p>

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">
        Send platform update
      </h2>
      <div className="rounded-2xl ring-1 ring-line bg-card p-3">
        <p className="text-[11px] leading-5 text-mute">
          Lands in every inbox under Updates after approval. Noisy by design — keep it rare.
        </p>
        <label className="mt-2 block">
          <span className="text-[11px] font-bold text-mute">Title (80 max)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="What's new in Sydney"
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[11px] font-bold text-mute">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="One or two sentences. Link target below."
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[11px] font-bold text-mute">Link</span>
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/"
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
          />
        </label>
        <Button className="mt-3 w-full" disabled={!title.trim() || !body.trim() || busy !== null} onClick={() => void compose()}>
          {busy === "compose" ? "Queueing…" : "Queue for review"}
        </Button>
      </div>

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">
        Waiting for review ({queue.length})
      </h2>
      {queue.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink/20 p-4 text-center text-xs text-mute">
          Queue is clear.
        </p>
      ) : (
        <div className="space-y-2">
          {queue.map((b) => (
            <div key={b.id} className="rounded-2xl ring-1 ring-line bg-card p-3">
              <p className="text-sm font-bold">{b.title}</p>
              <p className="mt-0.5 whitespace-pre-line text-sm">{b.body}</p>
              <p className="mt-1 text-[11px] text-mute">
                To {b.audience === "everyone" ? "everyone" : "campaign entrants"} ·{" "}
                {new Date(b.createdAt).toLocaleString()}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy === b.id + "approve"}
                  onClick={() => review(b, "approve")}
                  className="flex-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  Approve & send
                </button>
                <button
                  type="button"
                  disabled={busy === b.id + "reject"}
                  onClick={() => review(b, "reject")}
                  className="flex-1 rounded-xl ring-1 ring-line/15 px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mute">History</h2>
          <div className={cn("space-y-1 rounded-2xl ring-1 ring-line/15 bg-card p-3")}>
            {history.slice(0, 30).map((b) => (
              <p key={b.id} className="flex justify-between gap-2 text-[11px]">
                <span className="truncate font-semibold">{b.title}</span>
                <span className="shrink-0 text-mute">
                  {b.status}
                  {b.sentCount ? ` · ${b.sentCount}` : ""}
                </span>
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
