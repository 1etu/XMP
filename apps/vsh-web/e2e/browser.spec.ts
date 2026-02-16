import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 720 });
});

async function network(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.getByRole("button", { name: "Network", exact: true }).click();
}

test("opens Board articles in the browser and restores the same article", async ({
  page,
}) => {
  const originals: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/original/")) originals.push(request.url());
  });
  await page.route("https://1etu.github.io/MeltGL/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>MeltGL</title><h1>MeltGL test page</h1>",
    }),
  );
  await network(page);
  await page.getByRole("button", { name: "Information Board", exact: true }).click();
  const board = page.getByRole("dialog", { name: "Information Board" });
  await expect(board).toHaveAttribute("data-mode", "list");
  await expect(page.locator(".vsh-controls")).toBeHidden();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-mode", "article");
  await expect(board.getByRole("heading", { level: 2 })).toContainText("MeltGL");
  await page.getByRole("button", { name: "Open article website" }).click();
  const browser = page.getByRole("dialog", { name: "Internet Browser" });
  await expect(browser).toBeVisible();
  await expect(page.frameLocator(".webview iframe").getByRole("heading")).toHaveText(
    "MeltGL test page",
  );
  await page.getByRole("button", { name: "Browser menu", exact: true }).click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "tools", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("menuitem", { name: /^Exit/ }).click();
  await expect(browser).toBeHidden();
  await expect(board).toHaveAttribute("data-mode", "article");
  await expect(board.getByRole("heading", { level: 2 })).toContainText("MeltGL");
  await page.keyboard.press("Escape");
  await expect(board).toHaveAttribute("data-mode", "list");
  await page.keyboard.press("Escape");
  await expect(board).toBeHidden();
  await expect(page.locator(".vsh-board-ticker")).toBeVisible();
  expect(originals).toEqual([]);
});

test("keeps browser history, rejects unsafe URLs, and opens external tabs", async ({
  page,
  context,
}) => {
  await context.route("**/__webview-one", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<title>First page</title><h1>First page</h1><a href="/__webview-two">Second page</a>',
    }),
  );
  await context.route("**/__webview-two", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Second page</title><h1>Second page</h1>",
    }),
  );
  await network(page);
  await page.getByRole("button", { name: "Internet Browser", exact: true }).click();
  await page.getByRole("button", { name: "Enter address" }).click();
  await page.getByLabel("Address Entry").fill("javascript:alert(1)");
  await page
    .locator(".webview-form")
    .getByRole("button", { name: "Enter", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Enter an http or https address.");
  await page.getByLabel("Address Entry").fill("http://127.0.0.1:4173/__webview-one");
  await page
    .locator(".webview-form")
    .getByRole("button", { name: "Enter", exact: true })
    .click();
  await page
    .frameLocator(".webview iframe")
    .getByRole("link", { name: "Second page" })
    .click();
  await expect(page.frameLocator(".webview iframe").getByRole("heading")).toHaveText(
    "Second page",
  );
  await page.getByRole("button", { name: "Browser menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Back / }).click();
  await expect(page.frameLocator(".webview iframe").getByRole("heading")).toHaveText(
    "First page",
  );
  await page.getByRole("button", { name: "Browser menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Forward / }).click();
  await expect(page.frameLocator(".webview iframe").getByRole("heading")).toHaveText(
    "Second page",
  );
  const opened = context.waitForEvent("page");
  await page.getByRole("link", { name: "Open in New Tab", exact: true }).click();
  const external = await opened;
  await expect(external).toHaveURL(/\/__webview-two$/);
  expect(await external.evaluate(() => window.opener)).toBeNull();
  await external.close();
  await expect(page.locator(".webview")).toBeVisible();
  await page.getByRole("button", { name: "Browser menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /^View/ }).click();
  await page.getByRole("menuitem", { name: "Maximum Size" }).click();
  await expect(page.locator(".webview")).toHaveAttribute("data-maximum", "true");
});

test("preserves Board display preference and supports channel selection", async ({
  page,
}) => {
  await network(page);
  await page.getByRole("button", { name: "Information Board", exact: true }).click();
  await page.keyboard.press("KeyT");
  await expect(page.getByRole("listbox", { name: "News channels" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("listbox", { name: "Headlines" }).getByRole("option"),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.locator(".vsh-board-ticker")).toBeVisible();
  await page.reload();
  await expect(page.locator(".vsh-board-ticker")).toBeVisible();
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await page.keyboard.press("KeyT");
  await page.getByRole("menuitem", { name: "Do Not Display", exact: true }).click();
  await expect(page.locator(".vsh-board-ticker")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await expect(page.locator(".vsh-board-ticker")).toBeHidden();
});
