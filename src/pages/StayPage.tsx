import { useEffect } from "react";
import { useRoute, useSearch } from "wouter";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { noteQrContext } from "@/lib/analytics";
import { ConciergePage } from "./ConciergePage";

export function StayPage() {
  const [, params] = useRoute("/g/:id");
  const search = useSearch();
  const { setSession } = useStay();
  const { openAnswers, openContact, openChecklist } = useStayUi();

  useEffect(() => {
    const qs = new URLSearchParams(search);
    const inRaw = qs.get("in") || qs.get("checkin");
    const inDate = inRaw ? new Date(inRaw) : null;
    setSession({
      kind: "stay",
      propertyId: params?.id,
      roomToken: qs.get("r") || undefined,
      room: qs.get("room") || undefined,
      ...(inDate && !Number.isNaN(inDate.getTime()) ? { checkInAt: inDate.toISOString() } : {}),
    });
    if (params?.id) noteQrContext(`stay:${params.id}`, { propertyId: params.id, source: "stay" });
    const open = qs.get("open");
    if (open === "answers") openAnswers();
    if (open === "host") openContact();
    if (open === "checklist" || open === "leave") openChecklist();
  }, [openAnswers, openChecklist, openContact, params?.id, search, setSession]);

  return <ConciergePage />;
}
