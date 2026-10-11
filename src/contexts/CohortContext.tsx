import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  findInstitutionByCode,
  SEED_COHORT_EXPERIENCES,
  SEED_INSTITUTIONS,
  getBelongingReportData,
  type BelongingMetrics,
  type CohortHostedExperience,
  type Institution,
} from "@shared/cohort";
import {
  clearStoredCohortCode,
  getStoredCohortCode,
  saveStoredCohortCode,
  validateCohortJoin,
} from "@/lib/cohort-store";
import { useAuth } from "./AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export interface CohortContextValue {
  activeCohort: Institution | null;
  cohortCode: string | null;
  isCohortMember: boolean;
  hostedExperiences: CohortHostedExperience[];
  belongingReport: BelongingMetrics | null;
  joinCohort: (code: string) => { success: boolean; institution?: Institution; message: string };
  leaveCohort: () => void;
  availableInstitutions: Institution[];
}

const CohortContext = createContext<CohortContextValue | undefined>(undefined);

export function CohortProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cohortCode, setCohortCode] = useState<string | null>(() => getStoredCohortCode());

  const activeCohort = useMemo<Institution | null>(() => {
    if (!cohortCode) return null;
    return findInstitutionByCode(cohortCode) || null;
  }, [cohortCode]);

  const hostedExperiences = useMemo<CohortHostedExperience[]>(() => {
    if (!activeCohort) return [];
    return SEED_COHORT_EXPERIENCES[activeCohort.id] || [];
  }, [activeCohort]);

  const belongingReport = useMemo<BelongingMetrics | null>(() => {
    if (!activeCohort) return null;
    return getBelongingReportData(activeCohort.id);
  }, [activeCohort]);

  const joinCohort = useCallback(
    (code: string) => {
      const validation = validateCohortJoin(code);
      if (!validation.success || !validation.institution) {
        return {
          success: false,
          message: validation.error || "Invalid building or institution code.",
        };
      }

      const institution = validation.institution;
      setCohortCode(institution.code);
      saveStoredCohortCode(institution.code);

      // Best-effort Firestore update if user is authenticated
      if (user?.uid) {
        const db = getFirebaseDb();
        if (db) {
          const userRef = doc(db, "users", user.uid);
          void updateDoc(userRef, {
            institutionId: institution.id,
            cohortCode: institution.code,
            cohortJoinedAt: new Date().toISOString(),
          }).catch(() => undefined);
        }
      }

      return {
        success: true,
        institution,
        message: `Welcome to ${institution.name}!`,
      };
    },
    [user?.uid],
  );

  const leaveCohort = useCallback(() => {
    setCohortCode(null);
    clearStoredCohortCode();
    if (user?.uid) {
      const db = getFirebaseDb();
      if (db) {
        const userRef = doc(db, "users", user.uid);
        void updateDoc(userRef, {
          institutionId: null,
          cohortCode: null,
        }).catch(() => undefined);
      }
    }
  }, [user?.uid]);

  const value = useMemo<CohortContextValue>(
    () => ({
      activeCohort,
      cohortCode,
      isCohortMember: !!activeCohort,
      hostedExperiences,
      belongingReport,
      joinCohort,
      leaveCohort,
      availableInstitutions: SEED_INSTITUTIONS,
    }),
    [activeCohort, cohortCode, hostedExperiences, belongingReport, joinCohort, leaveCohort],
  );

  return <CohortContext.Provider value={value}>{children}</CohortContext.Provider>;
}

const DEFAULT_COHORT_CONTEXT: CohortContextValue = {
  activeCohort: null,
  cohortCode: null,
  isCohortMember: false,
  hostedExperiences: [],
  belongingReport: null,
  joinCohort: () => ({ success: false, message: "No cohort provider" }),
  leaveCohort: () => {},
  availableInstitutions: [],
};

export function useCohort(): CohortContextValue {
  const ctx = useContext(CohortContext);
  return ctx ?? DEFAULT_COHORT_CONTEXT;
}
