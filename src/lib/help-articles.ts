/** Static Knowledge Hub catalog for /help. Curated in-app content — no CMS.
 * Every href must be a registered internal route (see help-articles.test.ts).
 * Keep steps short, factual, and matched to shipped behavior. */

export type HelpCategoryId = "plans" | "tickets" | "safety" | "account" | "arrival";

export interface HelpCategory {
  id: HelpCategoryId;
  label: string;
  blurb: string;
}

export interface HelpArticleLink {
  label: string;
  href: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategoryId;
  summary: string;
  steps: string[];
  links: HelpArticleLink[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: "plans", label: "Plans", blurb: "Create plans, invite people, RSVP." },
  { id: "tickets", label: "Tickets & payments", blurb: "Pay, balances, cancellations, refunds." },
  { id: "safety", label: "Trust & safety", blurb: "Meet safely, verify, report, block." },
  { id: "account", label: "Account", blurb: "Sign in, profile, bio, settings." },
  { id: "arrival", label: "Resident arrival", blurb: "PBSA check-in, cohorts, building hub." },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "create-plan",
    title: "Create a plan",
    category: "plans",
    summary: "Turn “I want to do something” into a plan with a time, a place, and people.",
    steps: [
      "Open Plans and choose New plan.",
      "Add a title, date, time, and where you're meeting.",
      "Add stops for food, sights, or activities along the way.",
      "Share the invite link or 6-letter code — guests can view it without an account.",
      "Track RSVPs and nudge the crew from the plan page.",
    ],
    links: [
      { label: "New plan", href: "/plan/new" },
      { label: "Your plans", href: "/plan" },
    ],
  },
  {
    id: "invite-rsvp",
    title: "Invite people and RSVP",
    category: "plans",
    summary: "Every plan has a short invite code. RSVP Going, Maybe, or pass it on.",
    steps: [
      "Find the invite code on any plan you created.",
      "Share the code or link — it opens the plan on the web, no account needed to view.",
      "Guests RSVP Going or Maybe, and can add a note for the host.",
      "The host sees who's in and can message the crew from the plan.",
      "Plans stay editable until the day — stops, times, and notes can change.",
    ],
    links: [{ label: "Your plans", href: "/plan" }],
  },
  {
    id: "what-now",
    title: "Decide what to do",
    category: "plans",
    summary: "Tell AirPal your urge and time window — get one suggestion, then make it a plan.",
    steps: [
      "Open What now? and say what you feel like — tonight, this weekend, right now.",
      "Get one suggestion matched to live places near you.",
      "Tap Make it a plan to prefill a plan with the suggestion.",
      "Share the invite link — guests can view it without an account.",
      "Check in when you arrive, complete it after, and do it again any time.",
    ],
    links: [
      { label: "What now?", href: "/now" },
      { label: "New plan", href: "/plan/new" },
    ],
  },
  {
    id: "tickets-payments",
    title: "Tickets, bookings, and payments",
    category: "tickets",
    summary: "Pay for experiences securely. Free bookings need no payment at all.",
    steps: [
      "Book from a plan or event — free bookings confirm instantly.",
      "Paid bookings go through secure card checkout; AirPal never sees raw card numbers.",
      "Find every booking as a pass under Tickets in your account.",
      "Cancel unpaid bookings yourself; paid refunds go back to the original card.",
      "The host's share stays held until they mark the booking delivered.",
    ],
    links: [
      { label: "Your tickets", href: "/me/tickets" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "meet-safely",
    title: "Meet safely",
    category: "safety",
    summary: "Simple habits for meeting people through AirPal. AirPal never guarantees personal safety.",
    steps: [
      "Meet in a public place for the first few times.",
      "Tell someone where you're going and when you expect to be back.",
      "Keep chat inside AirPal until you've met and trust is earned.",
      "Check verification badges on profiles before you commit.",
      "Trust your instincts — you can always cancel and leave.",
    ],
    links: [
      { label: "Inbox", href: "/me/inbox" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    id: "report-block",
    title: "Report or block someone",
    category: "safety",
    summary: "Reports go to human review. Blocking is instant and private.",
    steps: [
      "Open the conversation, booking, or profile involved.",
      "Use Report to tell us what happened — a human reviews every case.",
      "Use Block to stop all contact immediately; they are not notified.",
      "For anything urgent or unsafe, contact us directly.",
      "Never share verification documents, passwords, or card details with anyone.",
    ],
    links: [
      { label: "Inbox", href: "/me/inbox" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    id: "account-bio",
    title: "Account, profile, and bio",
    category: "account",
    summary: "One AirPal account everywhere. You must be 18 or older to hold one.",
    steps: [
      "Sign in with email, phone, Google, or Apple — same account on web and app.",
      "Claim your personal @handle; it stays a person, never a business.",
      "Add a photo, bio, interests, and languages so friends know you.",
      "Businesses run on the same login as a separate profile.",
      "Manage privacy, notifications, and sign-in methods in Settings.",
    ],
    links: [
      { label: "Your account", href: "/me" },
      { label: "Settings", href: "/settings" },
      { label: "Set up your bio", href: "/bio/setup" },
    ],
  },
  {
    id: "resident-arrival",
    title: "Resident & PBSA arrival guide",
    category: "arrival",
    summary: "60-second resident check-in, building cohort assignment, and local perks.",
    steps: [
      "Open /join or scan your building's QR plaque at reception.",
      "Enter your 6-letter building code to join tonight's resident cohort.",
      "See tonight's resident events, meet neighbours, and discover local merchant perks.",
      "Your building circle is instantly unlocked in your networking circle.",
      "Need room assistance or maintenance? Dispatch support through your building desk.",
    ],
    links: [
      { label: "Arrival check-in", href: "/join" },
      { label: "Inner circle", href: "/circle" },
      { label: "Business hub", href: "/business" },
    ],
  },
];

export function getHelpArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.id === id);
}

/** Deep link support: /help?a=report-block opens that article when valid. */
export function helpArticleIdFromSearch(search: string): string | null {
  try {
    const id = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("a");
    return id && getHelpArticle(id) ? id : null;
  } catch {
    return null;
  }
}
