---
name: airpal-brain-reviewer
description: Evaluates product features, architecture, UI, and code changes against docs/AIRPAL_BRAIN.md (§18 Feature Evaluation Framework) and AGENTS.md to protect the North Star (Completed Experiences per Active User) and enforce P0-P4 priority gates.
---

# AirPal Brain Reviewer Skill

This skill enforces the product gates defined in **`docs/AIRPAL_BRAIN.md`**, **`AGENTS.md`**, and **`docs/CANON.md`**.

## Core Operating Principle
> **"Don't optimize for users. Optimize for completed experiences."**
> **Company Loop: Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat**
> **North Star Metric:** Completed AirPal Experiences per active user.

---

## Conflict Hierarchy
When documents or requirements conflict, resolve in this strict order:
1. **Safety, Security, Privacy, and Payment Integrity** (`AGENTS.md`)
2. **Shipped Chrome, Auth, and Identity Freeze** (`docs/CANON.md`)
3. **Brain on Expansion & Prioritization** (`docs/AIRPAL_BRAIN.md`)
4. Older vertical plans or feature requests

---

## §18 Feature Evaluation Framework
Before creating any new screen, route, Firestore collection, integration, or feature, evaluate against the 6 gates:

1. **Discovery:** Does it help someone discover what to do in their city?
2. **Connection:** Does it help them find a trusted person/mate to do it with?
3. **Planning:** Does it help them turn intent into a concrete, executable plan (time + place)?
4. **Completion:** Does it help them actually show up and complete the real-world experience?
5. **Trust & Safety:** Does it increase trust, identity verification, or safety?
6. **Business Value:** Does it create measurable value or facilitate legitimate marketplace transactions?

*Decision Rule:* If the answer is NO to most of these questions, do NOT build it.

---

## Priority Gates (§14)
- **P0 Transaction (Open / Must Prove First):** Plan → Connect → Experience → Complete (Sydney beachhead).
- **P1 Usability:** Discovery, matching, messaging, calendar, notifications, reviews, repeat retention.
- **P2 Monetization:** Bookings, platform commission, business partnerships, provider payouts.
- **P3 Expansion (Gated):** Stay as marketplace, Travel, Fashion, Daily as media layer.
- **P4 Infrastructure (Gated):** B2B Studio, SaaS, advertising, second native apps.

*Gate Rule:* Never start P3/P4 while P0 is unproven. If a proposal adds a new vertical, a separate standalone app, or vanity social metrics without driving completed experiences, REJECT or DEFER it.

---

## Anti-Pattern Checklist (What AirPal is NOT)
Reject changes that turn AirPal into:
- A generic social network or dating app
- An uncurated events directory or news feed
- A generic hotel/Airbnb clone without the experience connection layer
- An online e-commerce clothing store
- An AI chatbot with a marketplace attached (AI must be quiet intelligence proposing concrete plans)
- Multiple fragmented apps or user systems (Must maintain one platform, one identity)

---

## Review Procedure for Changes
When reviewing or proposing changes:
1. **Gate Check:** Does this change directly advance the P0/P1 transaction loop?
2. **Canon Check:** Does it preserve the frozen design tokens (AirPal Blue `#1805db`, 5-tab dock, NativeAuthGate vs website guest browsing, Firestore bios)?
3. **Safety & Privacy Check:** Are home addresses, verification docs, phone numbers, and moderation notes kept strictly private?
4. **Verification:** Does the change pass `npm test` and `npm run verify`?
