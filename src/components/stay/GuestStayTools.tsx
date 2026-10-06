import { Suspense, lazy, useState } from "react";
import { CircleHelp, ClipboardCheck, MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";

// Sheets load on demand — this widget mounts in the shell on every route,
// but the sheets (and their datasets) are only needed on stay routes.
const QuickAnswersSheet = lazy(() =>
  import("./QuickAnswersSheet").then((m) => ({ default: m.QuickAnswersSheet })),
);
const ContactHostSheet = lazy(() =>
  import("./ContactHostSheet").then((m) => ({ default: m.ContactHostSheet })),
);
const DepartureChecklistSheet = lazy(() =>
  import("./DepartureChecklistSheet").then((m) => ({ default: m.DepartureChecklistSheet })),
);

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
  const [expanded, setExpanded] = useState(false);
  const liveStay = session.kind === "stay" || session.kind === "campus" || Boolean(roomLabel);
  const onStayRoute =
    path.startsWith("/g/") ||
    path.startsWith("/c/") ||
    ((path.startsWith("/concierge") || path.startsWith("/stay")) && liveStay);
  const hidden = HIDE.some((re) => re.test(path));

  if (!onStayRoute || hidden) return null;

  const sheetOpen = answersOpen || contactOpen || checklistOpen;
  const toggle = () => {
    void triggerHapticSelection();
    setExpanded((prev) => !prev);
  };
  const run = (fn: () => void) => {
    void triggerHaptic("medium");
    setExpanded(false);
    fn();
  };

  return (
    <>
      {!sheetOpen && (
        <div className="pointer-events-none fixed left-4 bottom-32 z-50 flex flex-col items-start gap-2 md:bottom-10">
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="stay-tools"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="flex flex-col items-start gap-2"
              >
                <button
                  type="button"
                  onClick={() => run(openAnswers)}
                  className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink shadow-lg ring-1 ring-line"
                >
                  <CircleHelp size={16} className="text-accent" />
                  {t("answers")}
                </button>
                <button
                  type="button"
                  onClick={() => run(openChecklist)}
                  className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink shadow-lg ring-1 ring-line"
                >
                  <ClipboardCheck size={16} className="text-accent" />
                  {t("leave")}
                </button>
                <button
                  type="button"
                  onClick={() => run(() => openContact())}
                  className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink shadow-lg ring-1 ring-line"
                >
                  <MessageCircle size={16} className="text-accent" />
                  {t("contactHost")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Close" : t("contactHost")}
            className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-brand/30"
          >
            {expanded ? <X size={20} /> : <MessageCircle size={20} />}
            {expanded ? "Close" : t("host")}
          </button>
        </div>
      )}
      <Suspense fallback={null}>
        <QuickAnswersSheet />
        <ContactHostSheet />
        <DepartureChecklistSheet />
      </Suspense>
    </>
  );
}
