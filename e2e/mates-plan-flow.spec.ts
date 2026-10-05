import { test, expect } from "@playwright/test";

test.describe("Mates Social Planning & Digital Invitations Flow", () => {
  test("create plan is a stepped template flow", async ({ page }) => {
    await page.goto("/plan/new");
    await page.waitForLoadState("domcontentloaded");
    const gate = page.getByRole("heading", { name: /Plan with family/i });
    const stepped = page.getByRole("heading", { name: /What are you planning/i });
    await expect(gate.or(stepped)).toBeVisible();
    if (await gate.isVisible().catch(() => false)) {
      // Unauthenticated: sign-in gate holds the route.
      await expect(page.getByText(/Sign in/i).first()).toBeVisible();
      return;
    }

    // Step 0: template cards
    await expect(page.getByRole("button", { name: /Catch up/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hangout/i })).toBeVisible();
    await page.getByRole("button", { name: /Catch up/i }).click();

    // Step 1: details
    await expect(page.getByRole("heading", { name: /Where & when/i })).toBeVisible();
    await page.getByPlaceholder(/Friday drinks|Lunch|Hangout/i).fill("Harbour walk");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: who (skippable) → create
    await expect(page.getByRole("heading", { name: /Who's in/i })).toBeVisible();
    await page.getByRole("button", { name: "Create plan" }).click();
    await expect(page).toHaveURL(/\/plan\//);
  });

  test("allows anonymous mates to RSVP and updates guest list", async ({ page }) => {
    // Open the seed plan (page h1 — the card grid repeats the title)
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1", { hasText: /Friday Night Out in The Rocks/i })).toBeVisible({ timeout: 10000 });

    // Prefer the inline RSVP action, fall back to the sticky bottom-bar action
    const inlineRsvp = page.getByRole("button", { name: "RSVP (Free)" });
    const bottomRsvp = page.getByRole("button", { name: "RSVP Now" });
    if (await inlineRsvp.isVisible().catch(() => false)) {
      await inlineRsvp.click();
    } else if (await bottomRsvp.isVisible().catch(() => false)) {
      await bottomRsvp.click();
    } else {
      await page.getByRole("button", { name: /RSVP/i }).first().click();
    }

    // RSVP Sheet opens (exact names: plan cards behind the sheet also mention Going/Maybe)
    await expect(page.getByRole("heading", { name: "Your Response" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("form").getByRole("button", { name: "Going" })).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Maybe" })).toBeVisible();

    // Fill guest name
    const nameInput = page.getByPlaceholder("e.g. Alex or Jordan");
    await nameInput.fill("Sam Taylor");

    const noteInput = page.getByPlaceholder("e.g. Bringing drinks, arriving by 7pm!");
    await noteInput.fill("Bringing good vibes!");

    // Confirm RSVP with force to avoid mobile virtual scroll interception
    const confirmBtn = page.getByRole("button", { name: "Confirm RSVP" });
    await confirmBtn.click({ force: true });

    // Status strip should update
    await expect(page.getByText("You're in for this hangout!")).toBeVisible();
    await expect(page.getByRole("button", { name: /You're Going/i })).toBeVisible();

    // Switch to People tab to view guest list and note
    await page.getByRole("tab", { name: /^people/i }).click();
    await expect(page.getByText("Sam Taylor", { exact: true })).toBeVisible();
    await expect(page.getByText("Bringing good vibes!", { exact: true })).toBeVisible();
  });

  test("allows mates to co-plan and suggest itinerary stops", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    // Switch to Plan tab
    await page.getByRole("tab", { name: /^plan/i }).click();

    // Suggest a new stop through the current add-stop form
    const stopInput = page.getByPlaceholder(/Stop \/ venue name/i);
    await stopInput.fill("Sydney Harbour Lookout Point");

    await page.locator('input[type="time"]').fill("22:30");
    await page.getByRole("button", { name: "Add Stop" }).click();

    // Verify new stop rendered with 12-hour time badge
    await expect(page.getByText("Sydney Harbour Lookout Point", { exact: true })).toBeVisible();
    await expect(page.getByText(/10:30\s?PM/i).first()).toBeVisible();
  });

  test("toggles event following and provides calendar sync", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    // Click Follow
    const followBtn = page.getByRole("button", { name: /Follow/i }).first();
    await expect(followBtn).toBeVisible();
    await followBtn.click();

    // Changes to Following
    await expect(page.getByRole("button", { name: /Following/i }).first()).toBeVisible();

    // Verify Calendar export options are visible
    await expect(page.getByRole("button", { name: "Apple / Outlook (.ics)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Google Calendar" })).toBeVisible();
  });

  test("supports direct invite links /invite/:code", async ({ page }) => {
    // Invite codes resolve like plan ids; the invitation card renders
    await page.goto("/invite/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    // Resolves to plan
    await expect(page.locator("h1", { hasText: /Friday Night Out in The Rocks/i })).toBeVisible();
    await expect(page.getByText(/Invitation from/i)).toBeVisible();
  });
});
