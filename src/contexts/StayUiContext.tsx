import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type StayUi = {
  answersOpen: boolean;
  contactOpen: boolean;
  checklistOpen: boolean;
  contactDraft: string;
  openAnswers: () => void;
  openContact: (draft?: string) => void;
  openChecklist: () => void;
  closeStayUi: () => void;
  setContactDraft: (value: string) => void;
};

const StayUiContext = createContext<StayUi | undefined>(undefined);

export function StayUiProvider({ children }: { children: ReactNode }) {
  const [answersOpen, setAnswersOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState("");

  const openAnswers = useCallback(() => {
    setContactOpen(false);
    setChecklistOpen(false);
    setAnswersOpen(true);
  }, []);

  const openContact = useCallback((draft?: string) => {
    setAnswersOpen(false);
    setChecklistOpen(false);
    if (draft) setContactDraft(draft);
    setContactOpen(true);
  }, []);

  const openChecklist = useCallback(() => {
    setAnswersOpen(false);
    setContactOpen(false);
    setChecklistOpen(true);
  }, []);

  const closeStayUi = useCallback(() => {
    setAnswersOpen(false);
    setContactOpen(false);
    setChecklistOpen(false);
  }, []);

  return (
    <StayUiContext.Provider
      value={{
        answersOpen,
        contactOpen,
        checklistOpen,
        contactDraft,
        openAnswers,
        openContact,
        openChecklist,
        closeStayUi,
        setContactDraft,
      }}
    >
      {children}
    </StayUiContext.Provider>
  );
}

export function useStayUi() {
  const ctx = useContext(StayUiContext);
  if (!ctx) throw new Error("useStayUi");
  return ctx;
}
