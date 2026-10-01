import { CircleHelp, ClipboardCheck, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { QuickAnswersSheet } from "./QuickAnswersSheet";
import { ContactHostSheet } from "./ContactHostSheet";
import { DepartureChecklistSheet } from "./DepartureChecklistSheet";
import { useLocale } from "@/contexts/LocaleContext";

const HIDE = [
  /^\/scan/,
  /^\/host/,
  /^\/start/,
  /^\/admin/,
  /^\/partners/,
  /^\/join/,
  /^\/business/,
  /^\/event/,
  /^\/me/,
  /^\/e\//,
  /^\/bio/,
  /^\/@/,
];

export function GuestStayTools() {
  const [path] = useLocation();
  const { session, roomLabel } = useStay();
  const { answersOpen, contactOpen, checklistOpen, openAnswers, openContact, openChecklist } = useStayUi();
  const { t } = useLocale();
  const liveStay = session.kind === "stay" || session.kind === "campus" || Boolean(roomLabel);
  const onStayRoute =
    path.startsWith("/g/") ||
    path.startsWith("/c/") ||
    ((path.startsWith("/concierge") || path.startsWith("/stay")) && liveStay);
  const hidden = HIDE.some((re) => re.test(path));

  if (!onStayRoute || hidden) return null;

  return (
    <>
      {!answersOpen && !contactOpen && !checklistOpen && (
        <div className="pointer-events-none fixed left-4 bottom-32 z-50 flex flex-col items-start gap-2 md:bottom-10">
          <button
            type="button"
            onClick={openAnswers}
            className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium shadow-lg ring-1 ring-line"
          >
            <CircleHelp size={16} className="text-gold" />
            {t("answers")}
          </button>
          <button
            type="button"
            onClick={openChecklist}
            className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium shadow-lg ring-1 ring-line"
          >
            <ClipboardCheck size={16} className="text-gold" />
            {t("leave")}
          </button>
          <button
            type="button"
            onClick={() => openContact()}
            aria-label={t("contactHost")}
            className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-brand/30"
          >
            <MessageCircle size={20} />
            {t("host")}
          </button>
        </div>
      )}
      <QuickAnswersSheet />
      <ContactHostSheet />
      <DepartureChecklistSheet />
    </>
  );
}
