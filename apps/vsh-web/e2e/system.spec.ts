import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("shows system values and keeps controls only on pages and settings submenus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await expect(page.locator(".vsh-controls")).toBeHidden();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".vsh-controls")).toBeHidden();
  await page.getByRole("button", { name: "System Information", exact: true }).click();
  await expect(page.getByRole("heading", { name: "System Information" })).toBeVisible();
  await expect(page.getByRole("definition")).toContainText([
    "XMP",
    "WebGL 2",
    "1920 × 1080",
    "/",
  ]);
  await expect(page.locator(".xmb-indicator")).toBeHidden();
  await expect(page.locator(".vsh-controls button")).toHaveText(["Back"]);
  const circle = await page.locator('[data-binding="cancel"] svg').boundingBox();
  expect(circle).toMatchObject({ x: 1150, y: 892, width: 30, height: 30 });
  await expect(page.locator(".vsh-controls")).toHaveCSS("font-size", "21px");
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toHaveText("System Information");
  for (let index = 0; index < 3; index += 1) await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator(".vsh-controls")).toBeVisible();
  await expect(page.locator(".vsh-controls button")).toHaveText(["Enter", "Back"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".vsh-controls")).toBeHidden();
});

test("credits this site with original technology PNGs and research links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "About This Site", exact: true }).click();
  const credits = page.locator(".vsh-about");
  await expect(credits).toBeVisible();
  await expect(credits).not.toContainText(/nOS4|TurkeyDPI|MeltGL/);
  await expect(
    credits.getByRole("link", { name: "RPCS3 contributors" }),
  ).toHaveAttribute("href", "https://github.com/RPCS3/rpcs3");
  for (const name of ["TypeScript", "React", "WebGL"]) {
    const image = credits.getByRole("img", { name: `${name} logo`, exact: true });
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(credits.getByRole("link", { name, exact: true })).toHaveAttribute(
      "target",
      "_blank",
    );
  }
  const before = await page.locator(".vsh-about-strip").getAttribute("style");
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 1700);
  await expect(page.locator(".vsh-about-strip")).not.toHaveAttribute(
    "style",
    before ?? "",
  );
  await page.keyboard.press("Escape");
  await expect(credits).toHaveCount(0);
  await expect(page.locator(".xmb-label-on")).toHaveText("About This Site");
  expect(errors).toEqual([]);
});

test("shows real visitor presence without overlap in the date bar", async ({
  browser,
}) => {
  const first = await browser.newContext({ reducedMotion: "reduce" });
  const second = await browser.newContext({ reducedMotion: "reduce" });
  const one = await first.newPage();
  await one.goto("http://127.0.0.1:4173/?gl=webgl");
  const visitors = one.locator(".xmb-indicator-visitors");
  await expect(visitors).toHaveAttribute("aria-label", "1 visitor here now");
  const two = await second.newPage();
  await two.goto("http://127.0.0.1:4173/?gl=webgl");
  await expect(visitors).toHaveAttribute("aria-label", "2 visitors here now");
  const duplicate = await first.newPage();
  await duplicate.goto("http://127.0.0.1:4173/?gl=webgl");
  await expect(duplicate.locator(".xmb-indicator-visitors")).toHaveAttribute(
    "aria-label",
    "2 visitors here now",
  );
  await duplicate.close();
  await second.close();
  await expect(visitors).toHaveAttribute("aria-label", "1 visitor here now");
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await one.setViewportSize(viewport);
    const identity = await one.locator(".xmb-indicator-identity").boundingBox();
    const time = await one.locator(".xmb-indicator time").boundingBox();
    expect((identity?.x ?? 0) + (identity?.width ?? 0)).toBeLessThan(time?.x ?? 0);
  }
  await first.close();
});
