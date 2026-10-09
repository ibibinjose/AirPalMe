# AirPal Bio — Public Bio & Networking Profile (`/@handle`)
> **Specification, Architecture & Implementation Blueprint** for the shipped bio surface at `airpal.me/@handle` (`src/pages/BioPublicPage.tsx`). There is no separate `airpal.bio` domain or standalone app — bios live inside AirPal.Me (web + native shells).

---

## 1. Product Overview

**AirPal.Bio** is a personal and professional identity surface designed for seamless in-person networking, contact exchange, meeting coordination, and digital presence. 

Every user or verified venue/business claims a unique `@handle` (e.g. `airpal.me/@alex`) that serves as:
1. **Digital Business Card**: Instant contact saving (.vcf / vCard 3.0) directly into native iOS and Android Contacts apps without requiring the recipient to install an app.
2. **Real-Time Availability Hub**: Live status rings (🟢 Available, 🔴 Busy, ⛔ DND, 🟡 BRB, 🟠 Away, ⚪ Offline) with custom activity text (e.g. `"☕ Grabbing coffee in Surry Hills"`).
3. **Meet & Catch-Up Engine**: Frictionless inbound proposal system for 1-on-1 coffees (`Catch Up`), business chats (`Meeting`), or group plans (`Hangout`) with instant calendar export (Apple, Google, Outlook, iCal).
4. **Interactive Action Bar**: 1-tap direct messaging, external website navigation, WhatsApp direct messaging, and phone dialing.
5. **QR Code & Share Suite**: Vector QR generation, high-res PNG download for lanyards and conference badges, native OS share sheet triggering, and Apple Wallet pass integration.
6. **Viral Growth Loop**: Referral invite banner showing the owner's `@handle` as their invite code, driving organic signups.

---

## 2. Design System & Aesthetics

AirPal.Bio follows the **Liquid Glass** aesthetic:
- **Primary Color**: AirPal Blue (`#1805db` / `rgb(24, 5, 219)`)
- **Accent Color**: AirPal Blue accent (`text-accent`); the legacy `--color-gold` token resolves to brand blue in the shipped theme, so `text-gold` samples below render blue, not gold.
- **Backgrounds**: Multi-layered glassmorphic cards (`bg-card/95 backdrop-blur-xl ring-1 ring-line/80 shadow-clay`) over subtle gradient meshes.
- **Card Framing**: Rounded pill containers (`rounded-3xl` / `rounded-full`), generous touch targets ($\ge 44\text{px}$ touch targets), high-contrast typography.
- **Responsive Width**: Centered mobile-first canvas (`max-w-2xl mx-auto pb-safe`).

---

## 3. Data Models & TypeScript Interfaces

```typescript
// --- Handle Standards ---
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const HANDLE_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "");
}

// --- Availability & Status ---
export type AvailabilityStatus = "available" | "busy" | "dnd" | "brb" | "away" | "offline";

export interface AvailabilityStatusInfo {
  id: AvailabilityStatus;
  label: string;
  dotColor: string;
  ringClass: string;
  badgeBg: string;
  textColor: string;
  emoji: string;
  description: string;
}

export const AVAILABILITY_STATUSES: Record<AvailabilityStatus, AvailabilityStatusInfo> = {
  available: {
    id: "available",
    label: "Available",
    dotColor: "bg-emerald-500",
    ringClass: "ring-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.55)]",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    textColor: "text-emerald-700",
    emoji: "🟢",
    description: "Available & ready to connect, catch up or meet",
  },
  busy: {
    id: "busy",
    label: "Busy",
    dotColor: "bg-rose-500",
    ringClass: "ring-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.45)]",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    textColor: "text-rose-700",
    emoji: "🔴",
    description: "In a meeting, session or busy right now",
  },
  dnd: {
    id: "dnd",
    label: "Do not disturb",
    dotColor: "bg-red-600",
    ringClass: "ring-red-600 shadow-[0_0_16px_rgba(220,38,38,0.45)]",
    badgeBg: "bg-red-500/15 border-red-500/30",
    textColor: "text-red-700",
    emoji: "⛔",
    description: "Focused mode — notifications muted",
  },
  brb: {
    id: "brb",
    label: "Be right back",
    dotColor: "bg-amber-400",
    ringClass: "ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    textColor: "text-amber-700",
    emoji: "🟡",
    description: "Stepped away briefly — back shortly",
  },
  away: {
    id: "away",
    label: "Away",
    dotColor: "bg-orange-500",
    ringClass: "ring-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.45)]",
    badgeBg: "bg-orange-500/15 border-orange-500/30",
    textColor: "text-orange-700",
    emoji: "🟠",
    description: "Away from desk, exploring or travelling",
  },
  offline: {
    id: "offline",
    label: "Appear offline",
    dotColor: "bg-slate-400",
    ringClass: "ring-slate-300 shadow-none",
    badgeBg: "bg-slate-500/15 border-slate-500/30",
    textColor: "text-slate-600",
    emoji: "⚪",
    description: "Offline or closed for today",
  },
};

// --- Links & Outbound Tree ---
export type BioLinkType =
  | "website"
  | "whatsapp"
  | "call"
  | "maps"
  | "book"
  | "order"
  | "menu"
  | "instagram"
  | "linkedin"
  | "x"
  | "tiktok"
  | "youtube"
  | "threads"
  | "facebook"
  | "snapchat"
  | "pinterest";

export interface BioLink {
  id: string;
  type: BioLinkType;
  label: string;
  href: string;
}

// --- Catalogs & Offers ---
export interface BioCatalogItem {
  id: string;
  kind: "deal" | "product" | "service";
  title: string;
  detail: string;
  price?: string;
  badge?: string;
  href?: string;
}

// --- Core Profile Document ---
export interface BioProfile {
  id: string;
  handle: string;
  kind: "person" | "business";
  ownerUid?: string;
  name: string;
  avatar?: string;
  cover?: string;
  shortWhy?: string;
  aboutText?: string;
  city?: string;
  pronouns?: string;
  languages?: string;
  categoryTag?: string;
  starTier?: string; // e.g. "★ Rising Mate"
  phone?: string;
  domain?: string;
  
  // Real-time status
  availabilityStatus?: AvailabilityStatus;
  customStatus?: string;
  customStatusEmoji?: string;
  openNow?: boolean;
  hours?: string;

  // External Links & Catalogs
  links: BioLink[];
  products?: BioCatalogItem[];
  services?: BioCatalogItem[];
  deals?: BioCatalogItem[];
  offer?: {
    badge: string;
    detail: string;
  };

  // Geo & Maps
  mapsPlaceId?: string;
  geo?: { lat: number; lng: number };
}

// --- Meet & Catch-Up Proposals ---
export type CatchUpType = "catchup" | "meeting" | "nightout";

export interface CatchUpItem {
  id: string;
  targetHandle: string;
  targetUid?: string;
  requesterName: string;
  requesterHandle?: string;
  requesterPhoto?: string;
  requesterPhone?: string;
  requesterEmail?: string;
  type: CatchUpType;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  venue?: string;
  notes?: string;
  status: "pending" | "accepted" | "declined" | "dismissed";
  createdAt: string;
}
```

---

## 4. Key Functional Features & Implementation Code

### Feature A: Universal vCard 3.0 Generator & Contact Exporter
This code allows one-click saving of contacts directly into the phone's native address book. On iOS Safari, navigating directly to the vCard data URI opens the native "Create New Contact" sheet without downloading a raw file. On desktop, it downloads `.vcf`.

```typescript
export interface VCardInput {
  name: string;
  phone?: string;
  email?: string;
  url?: string;
  note?: string;
  org?: string;
  title?: string;
}

function escapeVCard(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildVCard(input: VCardInput): string {
  const parts = input.name.trim().split(" ");
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const firstName = parts[0] || input.name;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(input.name.trim())}`,
    `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
  ];

  if (input.org?.trim()) lines.push(`ORG:${escapeVCard(input.org.trim())}`);
  if (input.title?.trim()) lines.push(`TITLE:${escapeVCard(input.title.trim())}`);
  if (input.phone?.trim()) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCard(input.phone.trim())}`);
  if (input.email?.trim()) lines.push(`EMAIL:${escapeVCard(input.email.trim())}`);
  if (input.url?.trim()) lines.push(`URL:${escapeVCard(input.url.trim())}`);
  if (input.note?.trim()) lines.push(`NOTE:${escapeVCard(input.note.trim())}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

export function downloadVCard(input: VCardInput): void {
  const vcardText = buildVCard(input);
  const cleanName = input.name.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "Contact";
  const fileName = `${cleanName}.vcf`;
  const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function openVCardContact(input: VCardInput): Promise<"contact" | "download"> {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    const isMobileWeb = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    if (isMobileWeb) {
      // iOS Web natively parses data URI into Contact creation
      window.location.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(buildVCard(input))}`;
      return "contact";
    }
  }
  downloadVCard(input);
  return "download";
}
```

---

### Feature B: Fast QR Code Generation & Share Suite
Generates on-the-fly vector/canvas QR codes using standard libraries like `qrcode` or native SVG renderers.

```typescript
import QRCode from "qrcode";

export async function makeQrDataUrl(text: string, size = 360): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: "#121829",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}
```

**Share Modal Workflow:**
1. Renders high-contrast QR code for instant camera scanning.
2. 1-tap "Copy Link" with instant visual confirmation (`Copied ✓`).
3. 1-tap "Share" triggering `navigator.share({ title, text, url })` with fallback to clipboard.
4. "Download QR (.png)" for printing on stickers, name badges, and conference counters.

---

### Feature C: Interactive Action Bar
Four primary round or square touch targets placed right under the avatar and bio summary:

| Button | Target Action | Logic / URL Scheme |
|---|---|---|
| **Chat** | In-app Direct Messaging | Opens universal chat thread for `@handle` |
| **Website** | Primary Canonical URL | `target="_blank"` link to personal portfolio or company |
| **WhatsApp** | 1-Tap WhatsApp Chat | `https://wa.me/<cleaned_phone>` |
| **Call** | Direct Telephone Dial | `tel:<cleaned_phone>` |

---

### Feature D: Meet & Catch-Up Proposal System
Allows any visitor to request an in-person catch-up or virtual meeting:

1. **Catch Up (☕)**: Casual 1-on-1 coffee or drink.
2. **Meeting (📅)**: Professional 1-on-1 sync or interview.
3. **Hangout (👥)**: Social group outing or event.

When a proposal is submitted, the profile owner can inspect it in their **Inbox** and sync it with one tap to their personal calendar using standard calendar links:
- **Google Calendar URL**: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...`
- **Apple / Outlook (.ics)**: Standard iCalendar blob download.

```typescript
export function buildGoogleCalendarUrl(event: {
  title: string;
  description: string;
  venue?: string;
  startsAt: string; // ISO 8601
  durationHours?: number;
}): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + (event.durationHours || 1) * 3600000);

  const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    location: event.venue || "",
    dates: `${formatTime(start)}/${formatTime(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

---

### Feature E: "Remind Me to Catch Up" Button
For visitors browsing contacts:
- Tapping **"Remind me"** sets a local or server reminder (`toggleCatchUpReminder`).
- Stores the target `@handle` in the visitor's local "People I Met" registry.
- Visual badge switches to `"Reminder on ✓"` with a pulsing amber light.

---

### Feature F: Viral Invite Code Banner
Positioned right below the contact deck:
```html
<div class="rounded-2xl bg-gold/10 p-3.5 ring-1 ring-gold/30">
  <p class="text-[11px] font-bold uppercase tracking-wider text-gold">Join with Alex's code</p>
  <div class="mt-2 flex items-center gap-2">
    <code class="rounded-xl bg-card px-3 py-2 text-sm font-bold text-ink ring-1 ring-line/70">
      @alex
    </code>
    <button class="rounded-xl bg-card px-3.5 text-xs font-semibold">Copy</button>
    <button class="rounded-xl bg-ink px-3.5 text-xs font-semibold text-white">Invite</button>
  </div>
  <p class="mt-1.5 text-[11px] text-mute">
    Use this code when you join — you both earn Stars when you complete your first experience.
  </p>
</div>
```

---

## 5. Page Layout Architecture (`BioPublicPage`)

Below is the DOM and component hierarchy for rendering the complete profile:

```
BioPublicPage (Container: max-w-2xl mx-auto)
├── Glass Card Wrapper (bg-card/95 backdrop-blur-xl rounded-[36px] shadow-clay)
│   ├── Cover Photo / Atmospheric Gradient Header (h-48 sm:h-60)
│   │   └── Floating Navigation Dock
│   │       ├── Back Button & Brand Mark (AirPal)
│   │       └── Quick Share & Handle Badge ("@handle")
│   │
│   └── Profile Content Body (px-5 sm:px-8 pb-8)
│       ├── Avatar & Action Header Row
│       │   ├── Avatar Container (-mt-14 sm:-mt-16)
│       │   │   ├── High-res Photo with Status Ring (ring-4 ring-card)
│       │   │   └── Real-time Status Indicator Dot (🟢 Available / 🔴 Busy)
│       │   └── Profile Action Button Deck (Connect + Save Contact .vcf)
│       │
│       ├── Identity & Name Section
│       │   ├── Display Name & Category Tag (e.g. "PRODUCT DESIGNER")
│       │   ├── Handle (@handle) · Pronouns · Location Pin (City)
│       │   ├── Star Tier Badge (e.g. "★ RISING MATE")
│       │   └── Interactive Status Pill (e.g. "🟢 Available · ☕ Grabbing coffee")
│       │
│       ├── Short Why / Elevator Pitch & Extended About Story
│       │
│       ├── Social Interaction Deck (Follow, Like, QR Code Modal Trigger)
│       │
│       ├── 1-Tap Quick Action Deck (Chat, Website, WhatsApp, Call)
│       │
│       ├── Viral Invite Code Card (@handle referral box)
│       │
│       ├── Meet & Catch-Up Deck (Propose Coffee ☕ / Meeting 📅 / Hangout 👥)
│       │
│       ├── Owner Meetup Proposals Inbox (When authenticated owner visits their page)
│       │
│       ├── Public Hangout Plans & Events Grid (with 1-tap Calendar Sync)
│       │
│       ├── Featured Live Offers & Product Catalog Cards
│       │
│       ├── Outbound Link Tree (Custom high-priority buttons)
│       │
│       ├── Social Media Channels Strip (Instagram, LinkedIn, X, TikTok, GitHub)
│       │
│       ├── VIP Guest List / Newsletter Subscription Form
│       │
│       └── Brand Footer & "Claim your free @handle" viral link
│
├── BioShareModal (QR code display, link copy, PNG download)
├── BioCatchUpModal (Proposal creation form for visitors)
└── BioStatusModal (Owner availability picker & emoji status editor)
```

---

## 6. SEO, OpenGraph & JSON-LD Structured Data

To guarantee perfect previews when sharing links on WhatsApp, iMessage, LinkedIn, and Twitter:

```typescript
export function getBioMetaTags(bio: BioProfile, publicUrl: string) {
  const shareImg = bio.cover || bio.avatar || "https://airpal.me/brand/og-share.jpg";
  const bioDescription =
    bio.shortWhy ||
    bio.offer?.detail ||
    bio.customStatus ||
    `Connect with ${bio.name} (@${bio.handle}) on AirPal.Me — Life Made Easy.`;

  return {
    title: `${bio.name} (@${bio.handle}) · AirPal.Me`,
    meta: [
      { name: "description", content: bioDescription.slice(0, 160) },
      { property: "og:title", content: `${bio.name} (@${bio.handle}) · AirPal.Me` },
      { property: "og:description", content: bioDescription.slice(0, 160) },
      { property: "og:image", content: shareImg },
      { property: "og:url", content: publicUrl },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${bio.name} (@${bio.handle})` },
      { name: "twitter:description", content: bioDescription.slice(0, 160) },
      { name: "twitter:image", content: shareImg },
    ],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        name: bio.name,
        alternateName: `@${bio.handle}`,
        description: bioDescription,
        image: shareImg,
        url: publicUrl,
        ...(bio.city ? { homeLocation: { "@type": "Place", name: bio.city } } : {}),
      },
    },
  };
}
```

---

## 7. Handle Claiming & 404 State

When a visitor lands on an unreserved or uncreated handle (e.g. `airpal.me/@newmate`):
- Show a friendly **"Available Handle"** card:
  - Header: `@{handle} is available!`
  - Subtitle: `"This AirPal handle hasn't been set up yet. Be the first to claim @{handle} and launch your public bio page."`
  - Primary CTA: `"Claim @{handle}"` $\to$ `/bio/setup?handle={handle}` (signup/onboarding with prefilled handle).
  - Secondary CTA: `"Explore AirPal"` $\to$ `/` home.

---

## 8. Summary Checklist for Building `AirPal.Bio/@handle`

- [x] **Handle Routing**: Extract handle from URL, strip `@`, run `normalizeHandle()`.
- [x] **vCard Export**: Implement `openVCardContact()` with iOS `data:text/vcard` deep-link & desktop fallback.
- [x] **Real-Time Status Glow**: Implement `AVAILABILITY_STATUSES` with animated pulse indicators and status pill.
- [x] **Quick Action Deck**: Render Chat, Website, WhatsApp (`wa.me`), and Call (`tel:`) buttons.
- [x] **Meet & Catch Up**: Modal launcher for 1-on-1 coffee, sync meetings, and group plans.
- [x] **Calendar Sync**: Add Google Calendar and `.ics` download for accepted proposals.
- [x] **QR Code & Share Modal**: Dynamic canvas QR generation with PNG download.
- [x] **Viral Loop**: Owner invite code box with 1-click clipboard copy.
- [x] **SEO / Social Previews**: OpenGraph image, title, and Schema.org `ProfilePage` JSON-LD.
