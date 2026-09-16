import { useEffect } from "react";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { getFirebaseDb } from "@/lib/firebase";

/** Publishes city-only presence for Circle when the guest opts in. */
export function PresencePublisher() {
  const { user } = useAuth();
  const { mine } = useBio();
  const { city, shareLocation } = useLocalNow();
  const handle = mine?.handle;

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user || !handle) return;
    if (!shareLocation) {
      void deleteDoc(doc(db, "presence", handle)).catch(() => undefined);
      return;
    }
    void setDoc(doc(db, "presence", handle), {
      uid: user.uid,
      handle,
      city,
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }, [city, handle, shareLocation, user]);

  return null;
}
