import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { pullDeviceMirror, wireAutoPush } from "@/lib/device-mirror";

/**
 * Keeps device-local people + memories mirrored to the signed-in account.
 * Signed-out (or Stay-scan guest) sessions stay purely on-device.
 */
export function DeviceMirror() {
  const { user } = useAuth();
  // Anonymous/guest sessions have no user record — they stay purely on-device.
  const uid = user?.uid ?? null;
  const wired = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || wired.current === uid) return;
    wired.current = uid;
    wireAutoPush(uid);
    void pullDeviceMirror(uid);
  }, [uid]);

  useEffect(() => {
    if (uid) return;
    wired.current = null;
    wireAutoPush(null);
  }, [uid]);

  return null;
}
