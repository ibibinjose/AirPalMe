export const COMPANION_ROLES = [
  {
    id: "friend",
    label: "AirPal Friend",
    blurb: "Conversation, coffee, walks and casual hangouts",
    examples: ["Conversation", "Coffee", "Walks", "Casual hangouts", "Shared interests"],
  },
  {
    id: "teammate",
    label: "AirPal Teammate",
    blurb: "Study, work and building together",
    examples: ["Study together", "Work/accountability", "Projects", "Startup/building", "Learning"],
  },
  {
    id: "companion",
    label: "AirPal Companion",
    blurb: "Events, places and social outings together",
    examples: [
      "Attend events together",
      "Explore places",
      "Accompany someone to an activity",
      "Social outings",
      "General companionship",
    ],
  },
] as const;

export type CompanionRole = (typeof COMPANION_ROLES)[number]["id"];

export const COMPANION_ACTIVITIES = [
  "Coffee & conversation",
  "Walking",
  "Food",
  "Movies",
  "Events",
  "Sports",
  "Gaming",
  "Study",
  "Work/accountability",
  "Startup/business",
  "City exploration",
  "Cultural activities",
  "Other",
] as const;

export const COMPANION_AVAILABILITY = ["Weekdays", "Weeknights", "Weekends", "Flexible"] as const;

export const COMPANION_AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55+"] as const;

export const COMPANION_PRICING = ["free", "paid", "unsure"] as const;
export type CompanionPricing = (typeof COMPANION_PRICING)[number];

export const COMPANION_PRICING_LABEL: Record<CompanionPricing, string> = {
  free: "Free / community",
  paid: "Paid",
  unsure: "Not sure yet",
};

export const COMPANION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "declined",
  "more_info",
  "suspended",
] as const;
export type CompanionStatus = (typeof COMPANION_STATUSES)[number];

export const COMPANION_STATUS_LABEL: Record<CompanionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  declined: "Declined",
  more_info: "More Information Required",
  suspended: "Suspended",
};

/** Simple, human status copy shown to the applicant. */
export function companionStatusCopy(status: CompanionStatus): { title: string; body: string } {
  switch (status) {
    case "draft":
      return { title: "Application Draft", body: "Pick up where you left off whenever you're ready." };
    case "submitted":
      return { title: "Application Received", body: "Your application is in the queue for review." };
    case "under_review":
      return {
        title: "Application Under Review",
        body: "Your AirPal application is currently being reviewed.",
      };
    case "approved":
      return {
        title: "You're officially an AirPal",
        body: "Your application has been approved. Complete your AirPal profile to get started.",
      };
    case "declined":
      return {
        title: "Not approved this time",
        body: "Thank you for your interest in AirPal. Your application has not been approved at this time.",
      };
    case "more_info":
      return {
        title: "A little more info needed",
        body: "We need a little more information about your AirPal application. Update it below and resubmit.",
      };
    case "suspended":
      return {
        title: "AirPal Paused",
        body: "Your AirPal availability is currently paused. Contact the AirPal team for help.",
      };
  }
}

export interface CompanionApplication {
  applicationId: string;
  userId: string;
  roles: CompanionRole[];
  // Personal (prefilled from the account where available)
  fullName: string;
  photo?: string;
  email: string;
  phone: string;
  city: string;
  suburb: string;
  ageRange: string;
  // About
  introduction: string;
  languages: string[];
  interests: string[];
  hobbies: string[];
  enjoysWithOthers: string;
  activities: string[];
  availability: string[];
  serviceArea: string;
  pricingPreference: CompanionPricing;
  preferredRate?: string;
  motivation: string;
  /** Police clearance certificate / reference number. Required. Reviewers only. */
  policeClearanceNumber: string;
  /** Photo or scan of the certificate. Required. Reviewers only, never public. */
  policeClearanceDoc?: string;
  applicantAgreementAccepted: boolean;
  communityGuidelinesAccepted: boolean;
  /** 18+ confirmation. Required to submit; never shown on public profiles. */
  adultConfirmed: boolean;
  status: CompanionStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Private. Never shown on public profiles or to the applicant. */
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CompanionApplicationInput = Pick<
  CompanionApplication,
  | "roles"
  | "fullName"
  | "photo"
  | "email"
  | "phone"
  | "city"
  | "suburb"
  | "ageRange"
  | "introduction"
  | "languages"
  | "interests"
  | "hobbies"
  | "enjoysWithOthers"
  | "activities"
  | "availability"
  | "serviceArea"
  | "pricingPreference"
  | "preferredRate"
  | "motivation"
  | "policeClearanceNumber"
  | "policeClearanceDoc"
  | "applicantAgreementAccepted"
  | "communityGuidelinesAccepted"
  | "adultConfirmed"
>;

export interface CompanionValidationError {
  field: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Claims that suggest regulated or professional services. Flagged for admin review. */
const REGULATED_CLAIMS = [
  "therap",
  "counsell",
  "psycholog",
  "nurs",
  "massage",
  "physio",
  "medical",
  "doctor",
  "police check",
  "certified",
];

export function validateCompanionApplication(input: Partial<CompanionApplicationInput>): CompanionValidationError[] {
  const errors: CompanionValidationError[] = [];
  const need = (field: string, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message });
  };

  need("fullName", (input.fullName || "").trim().length >= 2, "Add your full name.");
  need("email", EMAIL_RE.test((input.email || "").trim()), "Add a valid email.");
  need("city", (input.city || "").trim().length >= 2, "Add your city.");
  need("roles", Array.isArray(input.roles) && input.roles.length > 0, "Choose at least one AirPal role.");
  need(
    "introduction",
    (input.introduction || "").trim().length >= 20,
    "Write a short introduction (at least 20 characters).",
  );
  need("motivation", (input.motivation || "").trim().length >= 10, "Tell us why you'd like to become an AirPal.");
  need(
    "policeClearanceNumber",
    (input.policeClearanceNumber || "").trim().length >= 4,
    "Add your police clearance certificate number.",
  );
  need(
    "policeClearanceDoc",
    (input.policeClearanceDoc || "").trim().length > 0,
    "Upload a photo or scan of your police clearance certificate.",
  );
  if (input.pricingPreference === "paid") {
    need("preferredRate", (input.preferredRate || "").trim().length > 0, "Add your preferred hourly/session rate.");
  }
  need(
    "applicantAgreementAccepted",
    input.applicantAgreementAccepted === true,
    "Accept the applicant agreement to continue.",
  );
  need(
    "communityGuidelinesAccepted",
    input.communityGuidelinesAccepted === true,
    "Accept the community guidelines to continue.",
  );
  need("adultConfirmed", input.adultConfirmed === true, "Confirm you are 18 or older to apply.");
  return errors;
}

/** Returns true when free text makes claims needing a closer admin look. */
export function flagsRegulatedClaims(
  input: Pick<CompanionApplicationInput, "introduction" | "motivation" | "activities">,
): boolean {
  const haystack = [input.introduction || "", input.motivation || "", (input.activities || []).join(" ")]
    .join(" ")
    .toLowerCase();
  return REGULATED_CLAIMS.some((claim) => haystack.includes(claim));
}

/** Public-safe view: strips private admin notes. Never expose adminNotes publicly. */
export function publicCompanionApplication(
  app: CompanionApplication,
): Omit<CompanionApplication, "adminNotes" | "adultConfirmed"> {
  const rest = { ...app };
  delete rest.adminNotes;
  delete (rest as Partial<CompanionApplication>).adultConfirmed;
  return rest;
}

/** Statuses an admin may move an application to from each state. */
export function allowedAdminTransitions(from: CompanionStatus): CompanionStatus[] {
  switch (from) {
    case "submitted":
      return ["under_review", "declined"];
    case "under_review":
      return ["approved", "declined", "more_info"];
    case "more_info":
      return ["under_review", "declined"];
    case "approved":
      return ["suspended"];
    case "suspended":
      return ["approved"];
    case "declined":
      return ["under_review"];
    case "draft":
      return [];
  }
}
