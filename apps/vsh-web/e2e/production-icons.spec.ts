import { expect, test } from "@playwright/test";

test("keeps shaded icons and the original artwork in the production build", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/xmb/icons/") && !response.ok()) {
      failedAssets.push(response.url());
    }
  });
  await page.goto("/?gl=webgl");
  await expect(page.locator(".vsh-status")).toHaveText("Ready.");
  for (const category of ["About Me", "Settings", "Projects", "Network"]) {
    await expect(
      page
        .getByRole("button", { name: category, exact: true })
        .locator(".xmb-material-layer")
        .last(),
    ).toHaveCSS("background-image", /(?:blob:|data:image\/png)/);
  }
  await expect(
    page
      .getByRole("button", { name: "What's New", exact: true })
      .locator(".xmb-material-layer")
      .last(),
  ).toHaveCSS("background-image", /\/xmb\/icons\/network\.png/);
  await page.screenshot({ path: "test-results/production-icons.png" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Theme Settings", exact: true }).click();
  await page.getByRole("button", { name: "Colour", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Orange", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("xmp.preferences") ?? "{}").color,
      ),
    )
    .toBe("orange");
  await expect(page.locator(".xmb-material-layer").first()).not.toHaveCSS(
    "background-image",
    /data:image\/svg/,
  );
  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});
