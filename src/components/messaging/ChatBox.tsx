import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { messageValid, type ChatMessage } from "@shared/messaging";
import { SafetyMenu } from "@/components/safety/SafetyMenu";

/** Match conversation: tied to one mate_request, parties only. */
export function ChatBox({
  requestId,
  readOnly = false,
  peerUid,
  peerName,
}: {
  requestId: string;
  readOnly?: boolean;
  peerUid?: string;
  peerName?: string;
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
    let cancelled = false;
    setLoadError(false);
    // Ensure the chat shell exists so both parties share one thread.
    if (!readOnly) {
      void setDoc(
        doc(db, "request_chats", requestId),
        { requestId, updatedAt: new Date().toISOString() },
        { merge: true },
      ).catch(() => undefined);
    }
    void getDocs(query(collection(db, "request_chats", requestId, "messages"), orderBy("createdAt", "asc"), limit(100)))
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
        setMessages(list);
        // Read state: mark others' messages seen.
        if (!readOnly && user && db) {
          for (const m of list) {
            if (m.senderUid !== user.uid && !m.readBy.includes(user.uid)) {
              void updateDoc(doc(db, "request_chats", requestId, "messages", m.id), {
                readBy: arrayUnion(user.uid),
              }).catch(() => undefined);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, readOnly, user, reloadKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send() {
    setError(null);
    if (readOnly) return;
    if (!requireUser("Sign in to message your Mate.")) return;
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
    } catch {
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-line">
      <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-4 text-mute">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-gold" />
        Keep this chat on AirPal. Don&apos;t share phone numbers or emails.
      </p>
      {peerUid && peerName && user && (
        <div className="mb-2">
          <SafetyMenu targetUid={peerUid} targetName={peerName} planId={requestId} />
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
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold text-brand">
              Retry
            </button>
          </p>
        )}
        {messages.map((m) => {
          const mine = user ? m.senderUid === user.uid : false;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-5 ${
                  mine ? "bg-brand text-white" : "bg-card text-ink ring-1 ring-line"
                }`}
              >
                <p>{m.text}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-mute"}`}>
                  {m.createdAt.slice(11, 16)} {mine && m.readBy.length > 1 ? "· seen" : ""}
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
