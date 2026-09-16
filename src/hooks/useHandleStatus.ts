import { useEffect, useState } from "react";
import { handleError, normalizeHandle } from "@shared/bio";
import { useBio } from "@/contexts/BioContext";

export function useHandleStatus(handle: string, exceptId?: string) {
  const { handleFree } = useBio();
  const [state, setState] = useState<{ ok: boolean; reason?: string; checking: boolean }>({ ok: false, checking: false });

  useEffect(() => {
    const h = normalizeHandle(handle);
    if (!h) {
      setState({ ok: false, checking: false });
      return;
    }
    const shape = handleError(h);
    if (shape) {
      setState({ ok: false, reason: shape, checking: false });
      return;
    }
    let live = true;
    setState({ ok: false, checking: true });
    const t = window.setTimeout(() => {
      void handleFree(h, exceptId).then((res) => {
        if (!live) return;
        setState({ ok: res.ok, reason: res.reason, checking: false });
      });
    }, 280);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [exceptId, handle, handleFree]);

  return state;
}
