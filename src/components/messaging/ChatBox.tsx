import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { triggerHaptic } from "@/lib/native";
import {
  messageValid,
  type ChatMessage,
  type MatchChatAction,
  type MatchChatActionId,
} from "@shared/messaging";
import { SafetyMenu } from "@/components/safety/SafetyMenu";

const PENDING_MESSAGE_KEY = "airpal:pending-message:v1";

interface PendingMessage {
  requestId: string;
  draft: string;
}

function stashPendingMessage(row: PendingMessage): void {
  try {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(row));
  } catch {
    /* private mode: best-effort */
  }
}

function takePendingMessage(requestId: string): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_MESSAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingMessage>;
    if (parsed.requestId !== requestId || typeof parsed.draft !== "string" || !parsed.draft.trim()) return null;
    sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    return parsed.draft.slice(0, 1000);
  } catch {
    return null;
  }
}

/** Match conversation: tied to one mate_request, parties only. */
export function ChatBox({
  requestId,
  readOnly = false,
  peerUid,
  peerName,
  actions,
  onAction,
}: {
  requestId: string;
  readOnly?: boolean;
  peerUid?: string;
  peerName?: string;
  actions?: MatchChatAction[];
  onAction?: (id: MatchChatActionId) => void;
}) {
  const { user, requireUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    setLoadError(false);
    // Ensure the chat shell exists so both parties share one thread.
    if (!readOnly) {
      void setDoc(
        doc(db, "request_chats", requestId),
        { requestId, updatedAt: new Date().toISOString() },
        { merge: true },
      ).catch(() => undefined);
    }

    const q = query(
      collection(db, "request_chats", requestId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
        setMessages(list);
        // Read state: mark others' messages seen.
        if (!readOnly && user && db) {
          for (const m of list) {
            const readBy = Array.isArray(m.readBy) ? m.readBy : [];
            if (m.senderUid !== user.uid && !readBy.includes(user.uid)) {
              void updateDoc(doc(db, "request_chats", requestId, "messages", m.id), {
                readBy: arrayUnion(user.uid),
              }).catch(() => undefined);
            }
          }
        }
      },
      () => {
        setLoadError(true);
      },
    );

    return () => {
      unsub();
    };
  }, [requestId, readOnly, user, reloadKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  // Restore a guest's unsent message after they finish signing in.
  useEffect(() => {
    if (!user || readOnly) return;
    const kept = takePendingMessage(requestId);
    if (kept) {
      setDraft(kept);
      toast.success("Signed in — your message is ready to send.");
    }
  }, [user, requestId, readOnly]);

  async function send() {
    setError(null);
    if (readOnly) return;
    if (!requireUser("Sign in to send your message — it's kept and ready when you return.")) {
      if (draft.trim()) stashPendingMessage({ requestId, draft: draft.trim().slice(0, 1000) });
      return;
    }
    if (!user || !messageValid(user.uid, draft)) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — chat runs on the live backend.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "request_chats", requestId, "messages"), {
        senderUid: user.uid,
        text: draft.trim().slice(0, 1000),
        readBy: [user.uid],
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(
        doc(db, "request_chats", requestId),
        { requestId, lastMessageAt: serverTimestamp(), updatedAt: now },
        { merge: true },
      );
      setMessages((list) => [
        ...list,
        {
          id: `local-${Date.now()}`,
          senderUid: user.uid,
          text: draft.trim().slice(0, 1000),
          readBy: [user.uid],
          createdAt: now,
        },
      ]);
      setDraft("");
    } catch (err) {
      const code = (err as { code?: string } | null)?.code || "";
      setError(
        code === "permission-denied"
          ? "You can't message here anymore — this match may have ended."
          : "Couldn't send. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-line">
      <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-4 text-mute">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-accent" />
        Keep this chat on AirPal. Don&apos;t share phone numbers or emails.
      </p>
      {peerUid && peerName && user && (
        <div className="mb-2">
          <SafetyMenu targetUid={peerUid} targetName={peerName} planId={requestId} />
        </div>
      )}
      {actions && actions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Next steps">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                onAction?.(a.id);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-accent ring-1 ring-brand/20 transition hover:bg-brand/20 active:scale-95"
            >
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1" role="log" aria-label="Match conversation">
        {messages.length === 0 && !loadError && (
          <p className="py-3 text-center text-[13px] text-mute">
            No messages yet. Say hello — keep phone numbers and emails out of chat.
          </p>
        )}
        {loadError && (
          <p className="py-3 text-center text-[13px]">
            <span className="font-semibold">Couldn’t load messages.</span>{" "}
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold text-accent">
              Retry
            </button>
          </p>
        )}
        {messages.map((m) => {
          const mine = user ? m.senderUid === user.uid : false;
          const readBy = Array.isArray(m.readBy) ? m.readBy : [];
          const stamp = typeof m.createdAt === "string" ? m.createdAt.slice(11, 16) : "";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-5 ${
                  mine ? "bg-brand text-white" : "bg-card text-ink ring-1 ring-line"
                }`}
              >
                <p>{m.text}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-mute"}`}>
                  {stamp} {mine && readBy.length > 1 ? "· seen" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {!readOnly && (
        <div className="mt-2">
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Message your Mate…"
              maxLength={1000}
              aria-label="Message your Mate"
              className="min-w-0 flex-1 rounded-full border border-line bg-card px-3.5 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
            />
            <Button
              size="sm"
              disabled={busy || !draft.trim()}
              loading={busy}
              onClick={() => void send()}
              aria-label="Send message"
            >
              <Send size={15} />
            </Button>
          </div>
          {error && <p className="mt-1.5 text-xs text-mute">{error}</p>}
        </div>
      )}
    </div>
  );
}
