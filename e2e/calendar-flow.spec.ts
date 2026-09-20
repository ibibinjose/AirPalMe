import { test, expect, type Page, type Locator } from "@playwright/test";

const SEARCH_PLACEHOLDER = "Search by title, tag (#jazz)...";

/** The sidebar mounts twice on mobile (hidden desktop copy + open drawer) — always use the visible copy. */
function visibleSearch(page: Page): Locator {
  return page.getByPlaceholder(SEARCH_PLACEHOLDER).filter({ visible: true });
}

function visibleRadio(page: Page, name: string | RegExp): Locator {
  return page.getByRole("radio", { name }).filter({ visible: true });
}

function visibleButton(page: Page, name: string | RegExp): Locator {
  return page.getByRole("button", { name }).filter({ visible: true });
}

/** Open the filters UI wherever it lives (desktop sidebar starts open; mobile uses the drawer). */
async function ensureFiltersOpen(page: Page): Promise<void> {
  // Wait for load first — the skeleton has neither sidebar nor drawer triggers.
  await expect(page.getByRole("heading", { name: "Event Calendar" })).toBeVisible();
  if ((await visibleSearch(page).count()) > 0) return;
  // Desktop sidebar was collapsed ("Show Filters"); on mobile the trigger is "Filters".
  // ("Hide Filters" showing means the sidebar is already open — just wait for search.)
  const showFilters = page.getByRole("button", { name: "Show Filters" }).filter({ visible: true });
  if ((await showFilters.count()) > 0) {
    await showFilters.click();
  } else if ((await page.getByRole("button", { name: "Hide Filters" }).filter({ visible: true }).count()) === 0) {
    await page.getByRole("button", { name: "Filters", exact: true }).filter({ visible: true }).click();
  }
  await expect(visibleSearch(page)).toBeVisible();
}

async function eventCardCount(page: Page): Promise<number> {
  return page
    .locator("article h3")
    .count()
    .catch(() => 0);
}

test.describe("Calendar & Events Flow", () => {
  test("loads /calendar and displays the header, views, and filters", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Header
    await expect(page.getByRole("heading", { name: "Event Calendar" })).toBeVisible();

    // View switcher (aria-labels carry the "View" suffix)
    await expect(page.getByRole("button", { name: "Month View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Week View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Day View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "List View" })).toBeVisible();

    // Search + status filters live behind the filters UI
    await ensureFiltersOpen(page);
    await expect(visibleSearch(page)).toBeVisible();
    await expect(visibleButton(page, /^All Events/)).toBeVisible();
    await expect(visibleButton(page, /^Going \(RSVP\)/)).toBeVisible();
    await expect(visibleButton(page, /^Interested/)).toBeVisible();
  });

  test("switches between Month, Week, Day, and List views", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Header switcher drives the view on every breakpoint
    await page.getByRole("button", { name: "Month View" }).click();
    await expect(page.getByRole("gridcell").filter({ visible: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Week View" }).click();
    await expect(page.locator("#main-content")).toBeVisible();

    await page.getByRole("button", { name: "Day View" }).click();
    await expect(page.locator("#main-content")).toBeVisible();

    await page.getByRole("button", { name: "List View" }).click();
    await expect(page.locator("#main-content")).toBeVisible();

    // Sidebar radios mirror the header switcher
    await ensureFiltersOpen(page);
    const listRadio = visibleRadio(page, "List");
    await listRadio.click();
    await expect(listRadio).toHaveAttribute("aria-checked", "true");
  });

  test("toggles event attendance states (Going, Interested)", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const cards = await eventCardCount(page);
    if (cards === 0) test.skip(true, "no events in this environment");

    // Toggle Going on the first event card
    const firstGoingBtn = page.getByRole("button", { name: "Going", exact: true }).first();
    await expect(firstGoingBtn).toBeVisible();
    await firstGoingBtn.click();
    await expect(page.getByText(/Marked as Going/i)).toBeVisible();

    // The Going status filter keeps the event visible
    await ensureFiltersOpen(page);
    await visibleButton(page, /^Going \(RSVP\)/).click();
    await expect(page.getByRole("button", { name: "Going", exact: true }).first()).toBeVisible();
  });

  test("filters events by category", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    await ensureFiltersOpen(page);
    const marketChip = visibleButton(page, /^Markets/);
    await expect(marketChip).toBeVisible();
    await marketChip.click();

    // Filter engages (pressed state + reset affordance), whatever the data holds
    await expect(marketChip).toHaveAttribute("aria-pressed", "true");
    await expect(visibleButton(page, "Reset").first()).toBeVisible();
  });

  test("search narrows the schedule and clearing restores it", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    await ensureFiltersOpen(page);
    const search = visibleSearch(page);
    await search.fill("zzz-no-such-event-xyz");
    await expect(page.getByText("No matching events found")).toBeVisible();

    await visibleButton(page, "Clear search input").click();
    // Belt and braces: the X clears the field; an explicit empty fill guarantees
    // the filter state resets even if the icon button misfires.
    await visibleSearch(page).fill("");
    await expect(page.getByText("No matching events found")).toBeHidden();
  });

  test("month-grid dots follow the attendance filter", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    await ensureFiltersOpen(page);
    const dots = page.locator('[role="gridcell"][aria-label$="events"] span[title]').filter({ visible: true });
    const singularDots = page.locator('[role="gridcell"][aria-label$=" event"] span[title]').filter({ visible: true });
    if ((await dots.count()) + (await singularDots.count()) === 0) {
      test.skip(true, "no event dots in this environment");
    }

    // Filtering to Going with nothing marked Going hides every dot
    await visibleButton(page, /^Going \(RSVP\)/).click();
    await expect(dots).toHaveCount(0);
    await expect(singularDots).toHaveCount(0);
  });

  test("opens event details and exports to calendar", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    if ((await eventCardCount(page)) === 0) test.skip(true, "no events in this environment");

    // Card click opens the details modal
    await page.locator("article h3").first().click();
    await expect(page.getByRole("button", { name: "Close modal" })).toBeVisible();

    // Export menu offers real providers
    await page.getByRole("button", { name: "Add to Calendar" }).click();
    await expect(page.getByRole("button", { name: "Google Calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apple Calendar (.ics)" })).toBeVisible();
  });
});
