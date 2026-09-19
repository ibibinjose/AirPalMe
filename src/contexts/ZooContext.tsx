import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { collectAtStop, emptyZoo, mergeZooState, type ZooHunt, type ZooHuntStop, type ZooState } from "@shared/zoo";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { loadZoo, persistZoo, subscribeZoo } from "@/lib/zoo-store";

type ZooValue = {
  state: ZooState;
  collect: (hunt: ZooHunt, stop: ZooHuntStop) => { fresh: boolean };
  like: (handle: string, liked: boolean) => void;
  follow: (handle: string, followed: boolean) => void;
};

const ZooContext = createContext<ZooValue | undefined>(undefined);

function remoteRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return doc(db, "users", uid, "zoo", "state");
}

export function ZooProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ZooState>(() => (typeof window === "undefined" ? emptyZoo() : loadZoo()));

  const save = useCallback(
    (next: ZooState) => {
      persistZoo(next);
      setState(next);
      if (!user) return;
      const ref = remoteRef(user.uid);
      if (!ref) return;
      void setDoc(ref, next, { merge: true }).catch(() => undefined);
    },
    [user],
  );

  useEffect(() => subscribeZoo(() => setState(loadZoo())), []);

  useEffect(() => {
    if (!user) return;
    const ref = remoteRef(user.uid);
    if (!ref) return;
    void getDoc(ref)
      .then((snap) => {
        const local = loadZoo();
        const remote = snap.exists() ? (snap.data() as ZooState) : emptyZoo();
        const merged = mergeZooState(local, {
          stickers: Array.isArray(remote.stickers) ? remote.stickers : [],
          shops: Array.isArray(remote.shops) ? remote.shops : [],
        });
        persistZoo(merged);
        setState(merged);
        void setDoc(ref, merged, { merge: true }).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [user?.uid]);

  const value = useMemo<ZooValue>(
    () => ({
      state,
      collect(hunt, stop) {
        const result = collectAtStop(loadZoo(), hunt, stop);
        save(result.state);
        return { fresh: result.fresh };
      },
      like(handle, liked) {
        const current = loadZoo();
        save({
          ...current,
          shops: current.shops.map((s) => (s.handle === handle ? { ...s, liked } : s)),
        });
      },
      follow(handle, followed) {
        const current = loadZoo();
        save({
          ...current,
          shops: current.shops.map((s) => (s.handle === handle ? { ...s, followed } : s)),
        });
      },
    }),
    [save, state],
  );

  return <ZooContext.Provider value={value}>{children}</ZooContext.Provider>;
}

export function useZoo() {
  const ctx = useContext(ZooContext);
  if (!ctx) throw new Error("useZoo");
  return ctx;
}
