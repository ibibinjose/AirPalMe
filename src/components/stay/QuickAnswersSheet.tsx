import { useEffect, useState } from "react";
import { Check, Clock, Copy, KeyRound, Wifi } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { buildQuickAnswers } from "@/lib/stay-answers";
import { getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";

type Tab = "rules" | "wifi" | "checkout";

export function QuickAnswersSheet() {
  const { property, session, roomLabel } = useStay();
  const { answersOpen, closeStayUi, openContact, openChecklist } = useStayUi();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("rules");
  const answers = buildQuickAnswers(property, session.kind, roomLabel);
  const [wifi, setWifi] = useState(answers.wifi);

  useEffect(() => {
    const fallback = buildQuickAnswers(property, session.kind, roomLabel).wifi;
    setWifi(fallback);
    if (!answersOpen || !liveBackendEnabled() || !session.propertyId) return;
    void getPropertyWifiRemote({
      propertyId: session.propertyId,
      roomToken: session.roomToken,
      markerId: session.markerId,
    })
      .then((res) => setWifi({ network: res.network, password: res.password, speed: res.speed || fallback.speed }))
      .catch(() => undefined);
  }, [answersOpen, property, roomLabel, session.kind, session.markerId, session.propertyId, session.roomToken]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "rules", label: t("rules") },
    { id: "wifi", label: t("wifi") },
    { id: "checkout", label: t("checkout") },
  ];

  return (
    <Sheet open={answersOpen} onClose={closeStayUi} title={t("quickAnswers")}>
      <p className="mb-4 text-[12px] text-mute">
        {answers.place}
        {answers.room ? ` · Room ${answers.room}` : ""}
      </p>
      <div className="mb-4 flex gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-medium",
              tab === item.id ? "bg-ink text-white" : "bg-paper ring-1 ring-line",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <ul className="space-y-2">
          {answers.rules.map((row) => (
            <li key={row.label} className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{row.label}</p>
              <p className="mt-1 text-[15px] leading-snug">{row.value}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === "wifi" && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-paper px-4 py-4 ring-1 ring-line">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
              <Wifi size={14} /> Network
            </p>
            <p className="font-display mt-1 text-2xl">{wifi.network}</p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
              <KeyRound size={14} className="mr-1 inline" /> Password
            </p>
            {wifi.password ? (
              <p className="mt-1 font-mono text-lg">{wifi.password}</p>
            ) : (
              <p className="mt-1 text-sm text-mute">Scan the room or lobby QR, or ask the desk.</p>
            )}
            <p className="mt-2 text-sm text-mute">{wifi.speed}</p>
          </div>
          {wifi.password ? (
            <Button
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(wifi.password);
                toast.success(t("copied"));
              }}
            >
              <Copy size={16} /> {t("copy")}
            </Button>
          ) : null}
        </div>
      )}

      {tab === "checkout" && (
        <>
          <ul className="space-y-2">
            {answers.checkout.map((row) => (
              <li key={row.label} className="flex gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
                <Clock size={16} className="mt-0.5 shrink-0 text-gold" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{row.label}</p>
                  <p className="mt-1 text-[15px] leading-snug">{row.value}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="mt-4 w-full" onClick={openChecklist}>
            {t("leavingList")}
          </Button>
        </>
      )}

      <button
        className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-brand"
        onClick={() => openContact()}
      >
        <Check size={14} /> {t("askTheHost")}
      </button>
    </Sheet>
  );
}
