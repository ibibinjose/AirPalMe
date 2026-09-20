import { test, expect } from "@playwright/test";

test.describe("Mates Social Planning & Digital Invitations Flow", () => {
  test("create plan is a short family-and-friends form", async ({ page }) => {
    await page.goto("/plan/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Create a Plan|Plan with family/i })).toBeVisible();
    const form = page.getByRole("heading", { name: "Create a Plan" });
    if (await form.isVisible()) {
      await expect(page.getByRole("button", { name: "Catch up" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Night out" })).toBeVisible();
      await expect(page.getByText(/^Photo$/i)).toBeVisible();
      await expect(page.getByText(/PNG, JPG, or WEBP/i)).toBeVisible();
      await page.getByPlaceholder(/Friday drinks|Lunch|Hangout/i).fill("Harbour walk");
      await page.getByRole("button", { name: "Create plan" }).click();
      await expect(page).toHaveURL(/\/plan\//);
    }
  });

  test("allows anonymous mates to RSVP and updates guest list", async ({ page }) => {
    // Open the seed plan (page h1 — the card grid repeats the title)
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1", { hasText: /Friday Night Out in The Rocks/i })).toBeVisible();

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
    await expect(page.getByRole("button", { name: "Going", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Maybe", exact: true })).toBeVisible();

    // Fill guest name
    const nameInput = page.getByPlaceholder("e.g. Alex or Jordan");
    await nameInput.fill("Sam Taylor");

    const noteInput = page.getByPlaceholder("e.g. Bringing drinks, arriving by 7pm!");
    await noteInput.fill("Bringing good vibes!");

    // Confirm RSVP with force to avoid mobile virtual scroll interception
    const confirmBtn = page.getByRole("button", { name: "Confirm RSVP" });
    await confirmBtn.click({ force: true });

    // Status strip should update
    await expect(page.getByText("You're in — see you there")).toBeVisible();
    await expect(page.getByText('"Bringing good vibes!"')).toBeVisible();

    // Guest list should show Sam Taylor
    await expect(page.getByText("Sam Taylor", { exact: true })).toBeVisible();
  });

  test("allows mates to co-plan and suggest itinerary stops", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

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
