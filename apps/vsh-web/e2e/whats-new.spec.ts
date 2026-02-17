import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openGrid(page: Page): Promise<void> {
  await page.goto("/?gl=webgl");
  await expect(page.locator(".vsh-status")).toHaveText("Ready.");
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowRight");
  await page.locator('[data-entry-id="whats-new"]').click();
  await expect(page.getByRole("grid", { name: "What's New items" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 1080 });
});

test("uses the native grid proportions and restores focus after video and information", async ({
  page,
}) => {
  const errors: string[] = [];
  const originals: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/original/")) originals.push(request.url());
  });
  await openGrid(page);
  await expect(page.locator('.wn-card[data-state="ready"]')).toHaveCount(9);
  const selected = page.locator('.wn-card[aria-selected="true"]');
  await expect(selected).toHaveCSS("width", "502px");
  expect(await selected.boundingBox()).toEqual({
    x: 444,
    y: 296.5,
    width: 502,
    height: 421,
  });
  await expect(page.locator(".vsh-controls")).toBeHidden();
  await expect(page.locator(".wn-status")).toHaveCSS("width", "1px");
  await page.keyboard.press("ArrowRight");
  await expect(selected).toContainText("MeltGL");
  await page.keyboard.press("Enter");
  await expect(page.locator(".vsh-media video")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(selected).toContainText("MeltGL");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("KeyT");
  await expect(
    page.getByRole("heading", { name: "TurkeyDPI", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(selected).toContainText("TurkeyDPI");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-entry-id="whats-new"]')).toBeFocused();
  expect(originals).toEqual([]);
  expect(errors).toEqual([]);
});

test("keeps a loading placeholder, cancels promptly, and retries an image failure", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route("**/portfolio/nos4/intro.png", async (route) => {
    await gate;
    if (fail) await route.abort();
    else await route.continue();
  });
  await openGrid(page);
  const card = page.locator('.wn-card[data-card-index="0"]');
  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(card.locator(".wn-spinner")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".whats-new")).toBeVisible();
  release?.();
  await expect(card).toHaveAttribute("data-state", "failed");
  fail = false;
  await page.getByRole("button", { name: "Retry nOS4" }).click();
  await expect(card).toHaveAttribute("data-state", "ready");
  await page.keyboard.press("Escape");
  await expect(page.locator(".whats-new")).toHaveCount(0);
  await expect(page.locator('[data-entry-id="whats-new"]')).toBeFocused();
});

test("keeps the selected card in view on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGrid(page);
  await expect(page.locator('.wn-card[data-state="ready"]')).toHaveCount(9);
  for (let index = 0; index < 3; index += 1) {
    await expect(page.locator('.wn-card[aria-selected="true"]')).toHaveAttribute(
      "data-card-index",
      String(index),
    );
    const bounds = await page.locator('.wn-card[aria-selected="true"]').boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.keyboard.press("ArrowRight");
  }
  await page.getByRole("button", { name: "Back to What's New" }).click();
  await expect(page.locator(".whats-new")).toHaveCount(0);
});
