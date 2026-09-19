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
    // Open the seed plan
    await page.goto("/plan/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /Friday Night Out in The Rocks/i })).toBeVisible();

    // Check initial RSVP button
    const rsvpBtn = page.getByRole("button", { name: /RSVP/i }).first();
    await expect(rsvpBtn).toBeVisible();
    await rsvpBtn.click();

    // RSVP Sheet opens
    await expect(page.getByRole("heading", { name: "Your Response" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Going/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Maybe/i })).toBeVisible();

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

    // Suggest a new stop
    const stopInput = page.getByPlaceholder("e.g. Messina Gelato or Barangaroo Lookout");
    await stopInput.fill("Sydney Harbour Lookout Point");

    const timeInput = page.getByPlaceholder("Time (optional)");
    await timeInput.fill("22:30");

    await page.getByRole("button", { name: "Suggest Stop" }).click();

    // Verify new stop rendered with time badge
    await expect(page.getByText("Sydney Harbour Lookout Point", { exact: true })).toBeVisible();
    await expect(page.getByText("22:30")).toBeVisible();
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
    await page.goto("/invite/ROCKS7");
    await page.waitForLoadState("domcontentloaded");

    // Resolves to plan
    await expect(page.getByRole("heading", { name: /Friday Night Out in The Rocks/i })).toBeVisible();
    await expect(page.getByText(/Invitation from/i)).toBeVisible();
  });
});
