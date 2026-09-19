import { expect, test } from "@playwright/test";

for (const route of ["user/", "work/nos4/"]) {
  test(`starts from ${route} and returns to the menu`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
      if (!response.ok()) failures.push(`${response.status()} ${response.url()}`);
    });
    const response = await page.goto(`${route}?gl=webgl`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".vsh-status")).toHaveText("Ready.");
    await expect(
      page.getByRole("region", {
        name: route === "user/" ? "1etu profile" : "nOS4 information",
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page
        .getByRole("navigation", { name: "Portfolio", exact: true })
        .getByRole("button", { name: "Projects", exact: true }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/(?:user|work\/nos4)\/?(?:\?|$)/);
    const material = page
      .getByRole("button", { name: "Settings", exact: true })
      .locator(".xmb-material-layer")
      .last();
    await expect(material).toHaveCSS("background-image", /(?:blob:|data:image\/png)/);
    expect(failures).toEqual([]);
  });
}
