import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("opens the native profile card and preserves its tab through Details", async ({
  page,
}) => {
  const originalRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/original/")) originalRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  for (const category of ["About Me", "Settings", "Projects", "Network"]) {
    const material = page
      .getByRole("button", { name: category, exact: true })
      .locator(".xmb-material-layer")
      .last();
    await expect(material).not.toHaveCSS("background-image", "none");
    expect(
      await material.evaluate(async (element) => {
        const image = new Image();
        image.src = getComputedStyle(element).backgroundImage.slice(5, -2);
        await image.decode();
        return image.naturalWidth > 0;
      }),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "About Me", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.xmb-label:not([aria-hidden="true"])')).toHaveText([
    "1etu",
  ]);
  await expect(page.locator(".vsh-controls kbd")).toHaveCount(0);
  await expect(page.locator(".vsh-controls")).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "1etu", exact: true })).toBeVisible();
  const enter = await page.locator('[data-binding="decide"] svg').boundingBox();
  expect(enter?.x).toBeCloseTo(481, 0);
  expect(enter?.width).toBeCloseTo(20, 0);
  expect((enter?.y ?? 0) + (enter?.height ?? 0) / 2).toBeCloseTo(605, 0);
  await expect(page.locator(".vsh-controls")).toHaveCSS("font-size", "15px");
  await expect(page.locator(".xmb-indicator")).toBeHidden();
  await expect(page.locator(".vsh-controls button")).toHaveText(["Enter", "Back"]);
  await expect(page.locator(".vsh-controls circle")).toHaveCount(1);
  const back = await page.locator('[data-binding="cancel"] svg').boundingBox();
  expect(back?.x).toBeCloseTo(767, 0);
  expect((back?.y ?? 0) + (back?.height ?? 0) / 2).toBeCloseTo(605, 0);
  const backText = await page.locator('[data-binding="cancel"] span').boundingBox();
  expect(backText?.x).toBeCloseTo(793, 0);
  const header = await page.locator(".vsh-profile-header").boundingBox();
  expect(header).toMatchObject({ x: 373, y: 161, width: 534, height: 118 });
  const detail = await page.locator(".vsh-profile-detail").boundingBox();
  expect(detail).toMatchObject({ x: 373, y: 273, width: 534, height: 202 });
  expect(await page.locator(".vsh-profile-balloon").boundingBox()).toMatchObject({
    x: 498,
    y: 173,
    width: 400,
    height: 44,
  });
  await expect(page.locator(".vsh-profile-balloon")).toHaveCSS("font-size", "14px");
  await expect(page.locator(".vsh-profile-fields dt").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await page.keyboard.press("PageDown");
  await expect(page.getByRole("definition")).toHaveCount(12);
  await expect(page.getByRole("term").first()).toHaveText("nOS4");
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() =>
      page.locator(".vsh-profile-fields").evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator(".vsh-text-page")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".vsh-profile")).toBeVisible();
  await expect(
    page.locator(".vsh-profile").getByRole("button", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Details", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toHaveText("1etu");
  expect(originalRequests).toEqual([]);
});

test("opens profile links in separate tabs and keeps the profile available", async ({
  page,
  context,
}) => {
  await context.route("https://github.com/1etu", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>GitHub profile</title>",
    }),
  );
  await context.route("https://dayetu.group/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Website</title>",
    }),
  );
  await page.goto("/user?gl=webgl");
  await expect(page.getByRole("heading", { name: "1etu", exact: true })).toBeVisible();
  for (const [label, url] of [
    ["GitHub", "https://github.com/1etu"],
    ["Website", "https://dayetu.group/"],
  ] as const) {
    const opened = context.waitForEvent("page");
    await page.getByRole("button", { name: label, exact: true }).click();
    const target = await opened;
    await expect(target).toHaveURL(url);
    expect(await target.evaluate(() => window.opener)).toBeNull();
    await expect(page).toHaveURL(/\/user\?gl=webgl$/);
    await expect(page.locator(".vsh-profile")).toBeVisible();
    await target.close();
  }
});

test("uses native 1080 profile fonts and keeps footer positions in the logical frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/user?gl=webgl");
  await expect(page.getByRole("heading", { name: "1etu", exact: true })).toBeVisible();
  expect(await page.locator(".vsh-profile-header").boundingBox()).toMatchObject({
    x: 560,
    y: 241,
    width: 800,
    height: 176,
  });
  expect(await page.locator(".vsh-profile-balloon").boundingBox()).toMatchObject({
    x: 746,
    y: 259,
    width: 600,
    height: 66,
  });
  await expect(page.locator(".vsh-profile-balloon")).toHaveCSS("font-size", "19px");
  await expect(page.locator(".vsh-profile-status h1")).toHaveCSS("font-size", "26px");
  await expect(page.locator(".vsh-profile-fields dt").first()).toHaveCSS(
    "font-size",
    "23px",
  );
  expect(await page.locator('[data-binding="decide"] svg').boundingBox()).toMatchObject(
    {
      x: 720,
      y: 892,
      width: 30,
      height: 30,
    },
  );
  expect(await page.locator('[data-binding="cancel"] svg').boundingBox()).toMatchObject(
    {
      x: 1150,
      y: 892,
      width: 30,
      height: 30,
    },
  );
  await expect(page.locator(".vsh-controls")).toHaveCSS("font-size", "21px");
  await page.setViewportSize({ width: 2048, height: 1044 });
  const glyph = await page.locator('[data-binding="decide"] svg').boundingBox();
  expect((glyph?.y ?? 0) + (glyph?.height ?? 0) / 2).toBeCloseTo(
    (907 * 2048) / 1920,
    1,
  );
});

test("keeps native information geometry and returns through Details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/work/cohesi?gl=webgl");
  await expect(
    page.getByRole("heading", { name: "cohesi", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".vsh-information")).toHaveCSS("font-size", "16px");
  const rules = await page
    .locator(".vsh-information")
    .evaluate((element) =>
      ["::before", "::after"].map((pseudo) =>
        Number.parseFloat(getComputedStyle(element, pseudo).top),
      ),
    );
  expect(rules).toEqual([133, 587]);
  const rows = page.locator(".vsh-info-fields dl > div");
  const first = await rows.nth(0).boundingBox();
  const second = await rows.nth(1).boundingBox();
  expect((second?.y ?? 0) - (first?.y ?? 0)).toBeCloseTo(27, 0);
  const badge = await page.locator(".vsh-user-badge").boundingBox();
  expect(badge?.y).toBeCloseTo(96, 0);
  expect(badge?.height).toBeCloseTo(36, 0);
  await page.keyboard.press("KeyT");
  await page.getByRole("menuitem", { name: "Details", exact: true }).click();
  await expect(page.locator(".vsh-text-page")).toBeVisible();
  await expect(page.locator(".vsh-info-fields")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".vsh-info-fields")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toContainText("cohesi");
});

test("keeps project routes and browser history in sync", async ({ page }) => {
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".xmb-label-on")).toContainText("Fun");
  await page.keyboard.press("Enter");
  await expect(page.locator(".xmb-label-on")).toContainText("nOS4");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/work\/nos4/);
  await expect(page.getByRole("heading", { name: "nOS4", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator(".vsh-information")).toHaveCount(0);
  await expect(page.locator(".xmb-label-on")).toContainText("nOS4");
  await page.goForward();
  await expect(page.getByRole("heading", { name: "nOS4", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/?\?gl=webgl$/);
  await expect(page.locator(".xmb-label-on")).toBeFocused();
  await expect(page.locator(".vsh-shell")).toHaveAttribute("data-startup", "complete");
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toContainText("Fun");
});

test("opens direct project and profile routes without the startup sequence", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/work/cohesi?gl=webgl");
  await expect(
    page.getByRole("heading", { name: "cohesi", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".vsh-shell")).toHaveAttribute("data-startup", "complete");
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toContainText("cohesi");
  await page.goto("/user?gl=webgl");
  await expect(page.getByRole("heading", { name: "1etu" })).toBeVisible();
  await expect(page.locator(".vsh-profile-location")).toHaveText("Bucharest, Romania");
});

test("opens gallery controls and returns through the presentation stack", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/work/nos4?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  await page.keyboard.press("KeyT");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.clock.runFor(50);
  await expect(page.locator(".vsh-media > img")).toHaveAttribute("src", /intro.png$/);
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(50);
  await expect(page.locator(".vsh-media > img")).toHaveAttribute("src", /apps.png$/);
  await page.keyboard.press("KeyT");
  await page.clock.runFor(50);
  await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator(".vsh-media > img")).toHaveAttribute("src", /safari.png$/);
  await page.keyboard.press("Escape");
  await page.clock.runFor(50);
  await expect(page.getByRole("heading", { name: "nOS4", exact: true })).toBeVisible();
});

test("plays a project video and stops it when the viewer closes", async ({ page }) => {
  await page.goto("/work/meltgl?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.keyboard.press("KeyT");
  await page.getByRole("menuitem", { name: "Play Video" }).click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((element) => element.readyState))
    .toBeGreaterThan(1);
  const handle = await video.elementHandle();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(video).toHaveCount(0);
  expect(await handle?.evaluate((element) => element.paused)).toBe(true);
  await expect(
    page.getByRole("heading", { name: "MeltGL", exact: true }),
  ).toBeVisible();
});

test("cancels a choice, saves nested settings, and retains them after reload", async ({
  page,
}) => {
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Theme Settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Colour", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Colour", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Blue", exact: true }).focus();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Colour", exact: true }).click();
  await expect(
    page.getByRole("menuitemradio", { name: "Original", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "Blue", exact: true }).click();
  await page.getByRole("button", { name: "Background", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Brightness", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "-2", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /Reduced/ }).click();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Ready.");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("xmp.preferences") ?? "null"),
    ),
  ).toMatchObject({
    background: "original",
    color: "blue",
    brightness: -2,
    motion: "reduced",
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Theme Settings", exact: true }).click();
  await page.getByRole("button", { name: "Colour", exact: true }).click();
  await expect(
    page.getByRole("menuitemradio", { name: "Blue", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});

test("shows a recoverable dialog for missing media and unknown routes", async ({
  page,
}) => {
  await page.route("**/portfolio/nos4/intro.png", (route) => route.abort());
  await page.goto("/work/nos4?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.keyboard.press("KeyT");
  await page.getByRole("menuitem", { name: "View Images" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("The image could not load");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("heading", { name: "nOS4", exact: true })).toBeVisible();
  await page.goto("/work/unknown?gl=webgl");
  await expect(page.getByRole("alertdialog")).toContainText("not available");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Portfolio" })).toBeVisible();
});

test("cancels stale previews during rapid navigation", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Libraries", exact: true }).click();
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(800);
  await expect(page.locator(".vsh-preview img")).toHaveAttribute(
    "src",
    /actual-fingerprints\/samples.png$/,
  );
  await page.keyboard.press("ArrowLeft");
  await page.clock.runFor(800);
  await expect(page.locator(".vsh-preview")).toBeHidden();
});

test("retains native links and usable touch targets on a phone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.getByRole("button", { name: "Projects", exact: true }).tap();
  await expect(page.locator(".xmb-label")).toHaveText([
    "Fun3 projects",
    "Libraries",
    "Networking",
    "Utilities",
  ]);
  await page.getByRole("button", { name: "Libraries", exact: true }).tap();
  await expect(page.locator(".vsh-controls")).toHaveAttribute(
    "data-input-device",
    "touch",
  );
  await expect(
    page.getByRole("navigation", { name: "Portfolio" }).getByRole("link"),
  ).toHaveText([
    "MeltGLMelts images and video in the browser with a real fluid simulation on the GPU",
    "Fingerprints",
  ]);
  const title = page.getByRole("link", { name: "MeltGL", exact: true });
  await expect(title).toHaveAttribute("href", "/work/meltgl");
  await title.tap();
  await expect(
    page.getByRole("heading", { name: "MeltGL", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".vsh-options")).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await expect(title).toBeVisible();
  await page.screenshot({ path: "test-results/portfolio-mobile.png" });
  await page.goto("http://127.0.0.1:4173/user?gl=webgl");
  await expect(page.getByRole("heading", { name: "1etu", exact: true })).toBeVisible();
  const tabs = page.locator(".vsh-profile-tabs button");
  for (const tab of await tabs.all()) {
    const box = await tab.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page
    .locator(".vsh-profile")
    .getByRole("button", { name: "Projects", exact: true })
    .tap();
  await expect(
    page.locator(".vsh-profile").getByRole("button", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const selectedTab = page.locator(".vsh-profile-tab-dots button[aria-current]");
  await expect(selectedTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(
    await selectedTab.evaluate((element) => getComputedStyle(element, "::after").width),
  ).toBe("6px");
  await page.getByRole("button", { name: "Details", exact: true }).tap();
  await expect(page.locator(".vsh-text-page")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await expect(page.locator(".vsh-profile")).toBeVisible();
  await page.screenshot({ path: "test-results/profile-mobile.png" });
  await context.close();
});

test("routes standard gamepad input through the active screen", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }));
    const controller = { connected: true, mapping: "standard", axes: [0, 0], buttons };
    Object.defineProperty(navigator, "getGamepads", { value: () => [controller] });
    Object.defineProperty(window, "testController", { value: controller });
  });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  const button = async (index: number, pressed: boolean): Promise<void> => {
    await page.evaluate(
      ({ index, pressed }) => {
        const controller = (
          window as unknown as { testController: { buttons: { pressed: boolean }[] } }
        ).testController;
        const target = controller.buttons[index];
        if (target !== undefined) target.pressed = pressed;
      },
      { index, pressed },
    );
    await page.clock.runFor(50);
  };
  await button(15, true);
  await expect(page.locator(".xmb-label-on")).toContainText("Theme Settings");
  await expect(page.locator(".vsh-controls")).toHaveAttribute(
    "data-input-device",
    "gamepad",
  );
  await button(15, false);
  await button(0, true);
  await expect(page.locator(".xmb-label-on")).toContainText("Theme");
  await button(0, false);
  await button(0, true);
  await expect(page.getByRole("menuitemradio", { name: /Original/ })).toBeVisible();
  await button(0, false);
  await button(1, true);
  await expect(page.locator(".vsh-choice")).toHaveCount(0);
  await button(1, false);
  await expect(page.locator(".xmb-label-on")).toContainText("Theme");
  await page.keyboard.press("ArrowLeft");
  await page.clock.runFor(50);
  await expect(page.locator(".vsh-controls")).toHaveAttribute(
    "data-input-device",
    "keyboard",
  );
  await expect(page.locator(".vsh-key-hint")).toHaveCount(0);
  await page.clock.resume();
  await page.goto("/user?gl=webgl");
  await expect(page.getByRole("heading", { name: "1etu", exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  await button(5, true);
  await expect(
    page.locator(".vsh-profile").getByRole("button", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await button(5, false);
  await button(4, true);
  await expect(
    page.getByRole("button", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await button(4, false);
});

test("retains the final selection during rapid navigation with motion enabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/work/nos4?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  await page.keyboard.press("Escape");
  await page.clock.runFor(600);
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(300);
  await expect(page.locator(".xmb-label-on")).toContainText("cohesi");
  await page.keyboard.press("ArrowUp");
  await page.clock.runFor(50);
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(600);
  await expect(page.locator(".xmb-label-on")).toContainText("cohesi");
  await page.clock.runFor(600);
  await expect(page.locator(".xmb-label-on")).toContainText("cohesi");
  await page.keyboard.press("Enter");
  await page.clock.runFor(600);
  await expect(page).toHaveURL(/\/work\/cohesi/);
  await expect(
    page.getByRole("heading", { name: "cohesi", exact: true }),
  ).toBeVisible();
});
