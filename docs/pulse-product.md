# AirPal Pulse — Phase 0 product lock

**Status:** Phase 1 Stay beachhead in progress (2026-09-24).  
**Owner:** AirPal Ops / product  
**Binding context:** `docs/BRAIN.md`, `docs/CANON.md`, `docs/host-tickets.md`

---

## 1. What AirPal Pulse is

AirPal Pulse is **in-the-moment experience intelligence and issue resolution** for partners (guests, diners, event attendees, later staff).

It is **not**:

- a generic survey SaaS
- the **Pulse social / daily discovery** ops bot (X + IG drafts)
- the Place route `/p/:id`
- a second app or Studio-first B2B product (Brain keeps Studio later)

Core loop:

**Capture → Understand → Alert → Resolve → Learn → Improve**

Principle: fix the experience while it is happening; don’t wait for the public review.

---

## 2. Naming (locked)

| Name | Meaning |
| --- | --- |
| **AirPal Pulse** (product) | Feedback + issue-resolution module inside AirPal.Me |
| **Pulse Social** (ops) | Existing teammate / routine for Sydney discovery drafts — keep separate in copy |
| **`/p/:id`** | Place page — **never** reuse for Pulse public URLs |

**Public URL (locked for MVP):** `/pulse/:publicToken`  
**Token format:** `pls_` + 20 URL-safe alphabet chars (opaque; never a Firestore id). Server lookup via `pulseTokens/{publicToken}`.  
Opaque token only. No Firestore IDs, business IDs, or private metadata in the path.

Alternate reserved if needed later: `/x/:publicToken` (do not ship both).

---

## 3. Beachhead (locked)

**MVP vertical: Stay / hotel room QR**

Why:

- Strongest existing DNA: guest QR stay session (`/g/...`, `/DemoHotel`), staff tickets, host alerts + FCM, print/QR helpers, property membership
- Matches Demo Hotel showcase already on `main`
- Proves Capture → Alert → Resolve without inventing Org → Business → Location tenancy on day one

**Explicitly deferred for MVP:** café-first table QR network, NFC tag factory, employee Pulse, AI themeing, Zapier/webhooks UI, review-site diversion, multi-org enterprise ACL.

Café / venue templates come **after** the Stay slice passes acceptance (§8).

---

## 4. How it mounts on AirPal.Me

### Product framing

Pulse MVP is a **Stay / host ops extension**, not a new Studio SaaS.

| Surface | Route / home |
| --- | --- |
| Public respondent | `/pulse/:publicToken` — mobile browser, no install, no account required |
| Host operator | `/host` tab or `/host/pulse` — builder (thin), responses, issues |
| Studio | Link only (“Pulse” card → host Pulse) — no separate Studio app |
| Stay attach | Optional CTA from Concierge / Demo Hotel: “How is your stay?” → same public Pulse |

### Reuse (do not rewrite)

- Staff ticket pattern: callable create → `properties/{id}/tickets` → trigger → `hostAlerts` + FCM (`docs/host-tickets.md`, `functions` tickets)
- Abuse / rate limits (`shared/abuse.ts`)
- QR generate/parse (`src/lib/qr.ts` + `@shared` URL helpers) — add intent `kind: "pulse"`
- Property members: `host_admin` / `staff` for operator ACL in MVP
- `EmojiRate` + `submitVenueRating` as **inspiration only** — Pulse responses are a separate model
- Analytics ledger — add Pulse events; never invent dashboard numbers

### Do not reuse wrongly

- Do not overload long-term Pulse issues as Stay-only ticket categories forever (allow convert-to-ticket or parallel `pulseIssues` with clear link)
- Do not ship local-only “sent” toasts (any Contact-host style fake desk chat stays out of Pulse)
- Do not put security only in the client
- Do not auto-push every positive to Google/TripAdvisor in MVP

---

## 5. MVP data model (property-scoped)

Hang MVP off **property**, not a new org tree:

```
properties/{propertyId}/pulses/{pulseId}
properties/{propertyId}/pulses/{pulseId}/questions/{questionId}
properties/{propertyId}/pulses/{pulseId}/logic/{ruleId}     # minimal IF in MVP
properties/{propertyId}/pulseDeployments/{deploymentId}    # publicToken, placement, QR
properties/{propertyId}/pulseResponses/{responseId}
properties/{propertyId}/pulseIssues/{issueId}              # or link → tickets/{id}
```

**publicToken** → deployment lookup via Cloud Function / indexed field (never client list of all pulses).

Guest writes: **callables only**, App Check + rate limits, mirror ticket anonymous pattern.

---

## 6. MVP scope (must ship)

Aligned to product definition §47, cut to Stay beachhead:

1. Host auth (existing Firebase + property membership)
2. Thin host Pulse dashboard (today: responses, open issues, avg rating)
3. Pulse builder (name, location/property, status, branding lite)
4. Question types (MVP subset): emoji/star rating, yes/no, single choice, short text, NPS **or** CSAT (pick one primary)
5. Conditional logic (minimal): e.g. rating ≤ 2 → “what went wrong?” → optional contact → create issue
6. Public mobile Pulse (`/pulse/:token`), &lt; ~45s happy path
7. QR download (PNG) for room / lobby card via existing QR helpers
8. Anonymous by default; optional contact after negative
9. Response inbox on host
10. Auto issue on rule match
11. Real-time alert: in-app host bell + FCM (email/SMS later)
12. Assign (optional MVP: assignee uid) + acknowledge
13. Resolve + resolution note + optional follow-up rating
14. Basic analytics (counts, avg rating, open/resolved — real queries only)
15. Location = property for MVP (multi-site org later)
16. Team = existing property members
17. Permissions = host_admin vs staff (staff: inbox + resolve; host_admin: publish + settings)
18. CSV export of responses

**Out of MVP:** NFC admin, visual logic canvas, smart multi-condition escalation trees, AI summaries, webhooks UI, billing, templates library beyond one Stay template, employee Pulse, review-gate manipulation.

---

## 7. Stay template (first template)

Lifecycle hooks (copy only; wire what exists):

Booking → Check-in → **During stay (primary MVP)** → Issue → Resolve → Checkout → Final feedback (phase 2)

During-stay starter questions (editable):

1. How is your stay? (1–5 or emoji)
2. If ≤ 2: What went wrong? (categories + text)
3. What can we do to help?
4. Optional: Want someone to contact you?

Categories seed from Stay world: service, staff, cleanliness, maintenance, dining, noise, wifi, other — map into ticket categories when converting to staff ticket.

---

## 8. Acceptance (Stay slice)

A hotel host must be able to:

1. Sign in and open host Pulse
2. Create a “During stay” Pulse on their property
3. Add the starter questions + rating≤2 branch
4. Publish and get a `publicToken` + QR
5. Scan QR on a second phone
6. Complete Pulse with no login
7. Submit a negative path
8. See an issue created automatically
9. Receive host alert (in-app; FCM if enabled)
10. Acknowledge / resolve with a note
11. Optionally send follow-up “how was the fix?”
12. See the lifecycle on the host Pulse dashboard (real data)

Demo Hotel (`/DemoHotel`) may deep-link or show a “How is your stay?” entry once Pulse exists — not before.

---

## 9. Phased roadmap

| Phase | Deliverable |
| --- | --- |
| **0** | This lock doc |
| **1** | Stay MVP vertical slice (§6–§8) |
| **2** | NFC / AirPal Tags + deployment placements (table/room) |
| **3** | Café / venue templates + BizScout partner attach |
| **4** | Ecosystem triggers (post-booking, post-Mate, post-event, post-deal) |
| **5** | Smart alerts, escalation timers, scheduled reports, labelled AI analysis |

---

## 10. Analytics events to add (authoritative)

- `pulse_viewed`
- `pulse_response_completed`
- `pulse_issue_created`
- `pulse_issue_acknowledged`
- `pulse_issue_resolved`
- `pulse_followup_completed`

Document in `docs/analytics-event-dictionary.md` before shipping UI that claims them.

---

## 11. Open decisions (non-blocking for Phase 1 design)

- Convert severe Pulse issues into existing `tickets` vs dedicated `pulseIssues` with optional “create staff ticket”
- Primary score: NPS vs CSAT vs 1–5 star for Stay template default
- Whether Demo Hotel shows Pulse CTA on first Pulse deploy

Default if unspecified at build time: **dedicated `pulseIssues` + optional “Create staff ticket”**, **1–5 + emoji**, Demo Hotel CTA **on**.

---

## 12. Build quality bar

Production foundations only: tenant isolation, callable validation, no fake analytics, no fake notifications, pending integrations labelled pending. Prefer small modules under `src/components/pulse/`, `functions/src/pulse.ts`, `shared/pulse.ts`.
