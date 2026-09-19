import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb } from "@/lib/firebase";
import { clearPendingIntent, peekPendingIntent } from "@/lib/pending-intent";
import { loadSocialSet, persistSocialSet, toggleSocialId, type SocialKind } from "@/lib/social-store";

type SocialValue = {
  likedHandles: Set<string>;
  followedHandles: Set<string>;
  likedByHandles: Set<string>;
  followerHandles: Set<string>;
  isLiked: (handle: string) => boolean;
  isFollowing: (handle: string) => boolean;
  /**
   * Guest-gated toggles. Return the applied state (true = now liked/following),
   * or null when the guest was asked to sign in instead.
   */
  toggleLike: (handle: string, name?: string) => boolean | null;
  toggleFollow: (handle: string, name?: string) => boolean | null;
};

const SocialContext = createContext<SocialValue | undefined>(undefined);

function norm(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

async function syncRemote(
  kind: SocialKind,
  uid: string,
  targetHandle: string,
  added: boolean,
  fromHandle?: string,
  fromName?: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !uid) return;
  const col = kind === "like" ? "likes" : "follows";
  const graphCol = kind === "like" ? "likedBy" : "followers";
  try {
    if (added) {
      await setDoc(doc(db, "users", uid, col, targetHandle), {
        handle: targetHandle,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await deleteDoc(doc(db, "users", uid, col, targetHandle));
    }
    if (fromHandle) {
      const graphRef = doc(db, "graph", targetHandle, graphCol, fromHandle);
      if (added) {
        await setDoc(graphRef, {
          uid,
          handle: fromHandle,
          name: fromName || fromHandle,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(graphRef);
      }
    }
  } catch {
    /* offline or denied: local state still wins */
  }
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, requireUser } = useAuth();
  const { mine } = useBio();
  const [liked, setLiked] = useState<Set<string>>(() => loadSocialSet("like"));
  const [followed, setFollowed] = useState<Set<string>>(() => loadSocialSet("follow"));
  const [likedBy, setLikedBy] = useState<Set<string>>(() => new Set());
  const [followers, setFollowers] = useState<Set<string>>(() => new Set());

  // Merge the signed-in user's cloud likes/follows once per login.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) return;
    let live = true;
    void Promise.all([
      getDocs(collection(db, "users", user.uid, "likes")),
      getDocs(collection(db, "users", user.uid, "follows")),
    ])
      .then(([likeSnap, followSnap]) => {
        if (!live) return;
        setLiked((prev) => {
          const next = new Set(prev);
          for (const d of likeSnap.docs) next.add(norm(d.id));
          persistSocialSet("like", next);
          return next;
        });
        setFollowed((prev) => {
          const next = new Set(prev);
          for (const d of followSnap.docs) next.add(norm(d.id));
          persistSocialSet("follow", next);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [user]);

  useEffect(() => {
    const db = getFirebaseDb();
    const handle = mine?.handle;
    if (!db || !user || !handle) {
      setLikedBy(new Set());
      setFollowers(new Set());
      return;
    }
    let live = true;
    void Promise.all([
      getDocs(collection(db, "graph", handle, "likedBy")),
      getDocs(collection(db, "graph", handle, "followers")),
    ])
      .then(([likeSnap, followSnap]) => {
        if (!live) return;
        setLikedBy(new Set(likeSnap.docs.map((d) => norm(d.id))));
        setFollowers(new Set(followSnap.docs.map((d) => norm(d.id))));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mine?.handle, user]);

  const applyToggle = useCallback(
    (kind: SocialKind, rawHandle: string, name?: string): boolean => {
      const handle = norm(rawHandle);
      if (!handle) return false;
      const current = kind === "like" ? liked : followed;
      const { next, added } = toggleSocialId(current, handle);
      if (kind === "like") {
        setLiked(next);
      } else {
        setFollowed(next);
      }
      persistSocialSet(kind, next);
      const label = name?.trim() || `@${handle}`;
      if (added) toast.success(kind === "like" ? `Liked ${label}` : `Following ${label}`);
      const uid = user?.uid;
      if (uid) void syncRemote(kind, uid, handle, added, mine?.handle, mine?.name);
      return added;
    },
    [followed, liked, mine?.handle, mine?.name, user],
  );

  const toggleLike = useCallback(
    (rawHandle: string, name?: string): boolean | null => {
      const handle = norm(rawHandle);
      if (
        !requireUser("Sign in to like places — your liked list syncs across devices.", {
          kind: "like-handle",
          id: handle,
        })
      )
        return null;
      return applyToggle("like", handle, name);
    },
    [applyToggle, requireUser],
  );

  const toggleFollow = useCallback(
    (rawHandle: string, name?: string): boolean | null => {
      const handle = norm(rawHandle);
      if (
        !requireUser("Sign in to follow places — we will flag their new offers and events for you.", {
          kind: "follow-handle",
          id: handle,
        })
      )
        return null;
      return applyToggle("follow", handle, name);
    },
    [applyToggle, requireUser],
  );

  // Resume the guest's pending follow/like once they finish signing in.
  useEffect(() => {
    if (!user) return;
    const intent = peekPendingIntent();
    if (!intent) return;
    if (intent.kind === "follow-handle") {
      clearPendingIntent();
      applyToggle("follow", intent.id);
    } else if (intent.kind === "like-handle") {
      clearPendingIntent();
      applyToggle("like", intent.id);
    }
  }, [user, applyToggle]);

  const value = useMemo<SocialValue>(
    () => ({
      likedHandles: liked,
      followedHandles: followed,
      likedByHandles: likedBy,
      followerHandles: followers,
      isLiked: (handle) => liked.has(norm(handle)),
      isFollowing: (handle) => followed.has(norm(handle)),
      toggleLike,
      toggleFollow,
    }),
    [followed, followers, liked, likedBy, toggleFollow, toggleLike],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial");
  return ctx;
}
