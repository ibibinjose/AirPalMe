import {
  findInstitutionByCode,
  SEED_COHORT_EXPERIENCES,
  type CohortHostedExperience,
  type Institution,
} from "@shared/cohort";
import { safeLocalStorage } from "./safe-storage";

export const COHORT_STORAGE_KEY = "airpal_active_cohort_code";

export function getStoredCohortCode(): string | null {
  return safeLocalStorage()?.getItem(COHORT_STORAGE_KEY) ?? null;
}

export function saveStoredCohortCode(code: string): void {
  safeLocalStorage()?.setItem(COHORT_STORAGE_KEY, code.trim().toUpperCase());
}

export function clearStoredCohortCode(): void {
  safeLocalStorage()?.removeItem(COHORT_STORAGE_KEY);
}

export function getActiveInstitutionFromStorage(): Institution | null {
  const code = getStoredCohortCode();
  if (!code) return null;
  return findInstitutionByCode(code) || null;
}

export function getActiveCohortExperiences(institutionId?: string | null): CohortHostedExperience[] {
  if (!institutionId) return [];
  return SEED_COHORT_EXPERIENCES[institutionId] || [];
}

export function validateCohortJoin(code: string): {
  success: boolean;
  institution?: Institution;
  error?: string;
} {
  if (!code || !code.trim()) {
    return { success: false, error: "Please enter your building or cohort code." };
  }
  const institution = findInstitutionByCode(code.trim());
  if (!institution) {
    return {
      success: false,
      error: "Building code not found. Please check your resident welcome pack.",
    };
  }
  return { success: true, institution };
}
