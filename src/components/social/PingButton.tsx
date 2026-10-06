import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, getDocs, limit, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { createSubmitGuard } from "@/lib/submit-guard";
import { triggerHaptic } from "@/lib/native";
import { isOpenPing, type PingStatus } from "@shared/ping";

/**
 * AirPal Ping — the tap on the shoulder. Sends a lightweight "want to hang
 * out" nudge to a person on AirPal; the recipient answers from their inbox
 * (ping back → make a plan). Guests are routed through sign-in first.
 */
export function PingButton({ toUid, toHandle, toName }: { toUid: string; toHandle: string; toName: string }) {
  const { user, requireUser } = useAuth();
  const { mine } = useBio();
  const [openPing, setOpenPing] = useState(false);
  const [sending, setSending] = useState(false);
  const guardRef = useRef(createSubmitGuard());

  useEffect(() => {
    if (!user || user.uid === toUid) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) return;
    let live = true;
    void getDocs(
      query(
        collection(db, "pings"),
        where("fromUid", "==", user.uid),
        where("toUid", "==", toUid),
        limit(10),
      ),
    )
      .then((snap) => {
        if (!live) return;
        setOpenPing(snap.docs.some((d) => isOpenPing(d.data().status as PingStatus)));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user, toUid]);

  if (user && user.uid === toUid) return null;

  if (openPing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-2 text-xs font-semibold text-accent">
        <Zap size={14} />
        Pinged
      </span>
    );
  }

  async function send() {
    if (!requireUser("Sign in to ping people on AirPal.")) return;
    if (!user) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      toast.error("Connect Firebase first — pings go through the live backend.");
      return;
    }
    if (!guardRef.current.tryAcquire()) return;
    setSending(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "pings"), {
        fromUid: user.uid,
        fromName: user.displayName || mine?.name || "AirPal Mate",
        ...(mine?.handle ? { fromHandle: mine.handle } : {}),
        toUid,
        toHandle,
        status: "sent",
        createdAt: now,
        updatedAt: now,
      });
      setOpenPing(true);
      void triggerHaptic("success");
      toast.success(`Pinged ${toName} — we'll tell you when they ping back.`);
    } catch (err) {
      void triggerHaptic("error");
      guardRef.current.release();
      toast.error(err instanceof Error ? err.message : "Couldn't send the ping.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={sending}
      className="gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink shadow-sm hover:bg-paper"
      onClick={() => void send()}
    >
      <Zap size={14} className="text-accent" />
      <span>{sending ? "Pinging…" : "Ping"}</span>
    </Button>
  );
}
