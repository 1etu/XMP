import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("plays the startup before a continuous menu reveal", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install({ time: new Date("2009-09-01T00:48:00") });
  await page.goto("/?gl=webgl");
  const surface = page.locator(".vsh-shell");
  await expect(surface).toHaveAttribute("data-startup", "active");
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 10));
  const value = (name: string): Promise<number> =>
    surface.evaluate(
      (element, property) => Number(element.style.getPropertyValue(property)),
      name,
    );
  await page.clock.runFor(3000);
  expect(await value("--startup-logo")).toBeGreaterThan(0.9);
  expect(await value("--startup-menu")).toBe(0);
  await page.clock.runFor(3500);
  expect(await value("--startup-logo")).toBe(0);
  await expect(page.locator(".xmb")).toHaveCount(0);
  await page.clock.runFor(2500);
  expect(await value("--startup-menu")).toBeGreaterThan(0.9);
  expect(await value("--startup-menu-scale")).toBeLessThan(1.01);
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(400);
  await expect(page.locator(".xmb-label-on")).toContainText("Theme Settings");
  await page.clock.runFor(2200);
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await expect(surface).toHaveAttribute("data-startup", "complete");
  expect(await value("--startup-menu-scale")).toBe(1);
});

test("skips the startup motion when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await expect(page.locator(".vsh-shell")).toHaveAttribute("data-startup", "complete");
  await expect(page.locator(".vsh-startup")).toBeHidden();
});

test("breathes the focused title without moving its text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-09-17T12:00:00") });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 10));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const title = page.locator(".xmb-label-on .xmb-label-text");
  const glow = (): Promise<string> =>
    title.evaluate((element) => getComputedStyle(element).textShadow);
  await page.clock.runFor(50);
  const bounds = await title.boundingBox();
  const bright = await glow();
  await page.clock.runFor(550);
  expect(await glow()).not.toBe(bright);
  expect(await title.boundingBox()).toEqual(bounds);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(50);
  const steady = await glow();
  await page.clock.runFor(1200);
  expect(await glow()).toBe(steady);
});

test("reaches ready without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");

  await expect(page.getByRole("status")).toHaveText("Ready.", { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "test-results/shell.png" });

  const state = await page.evaluate(() => {
    const c = document.querySelector("canvas") as HTMLCanvasElement;
    const gl = c.getContext("webgl2");
    return { w: c.width, h: c.height, err: gl ? gl.getError() : -1 };
  });

  expect(errors, errors.join("\n")).toEqual([]);
  expect(state.w).toBeGreaterThan(0);
  expect(state.h).toBeGreaterThan(0);
  expect(state.err).toBe(0);
});

test("gl override forces the webgl2 backend", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/?gl=webgl");

  await expect(page.getByRole("status")).toHaveText("Ready.", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/shell-webgl.png" });

  const live = await page.evaluate(() => {
    const c = document.querySelector("canvas") as HTMLCanvasElement;
    const gl = c.getContext("webgl2");
    return gl !== null && gl.getError() === 0;
  });

  expect(errors, errors.join("\n")).toEqual([]);
  expect(live).toBe(true);
});

test("opens a settings selection and returns to the same item", async ({ page }) => {
  const originals: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/original/")) originals.push(request.url());
  });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".xmb-label-on")).toContainText("Motion");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio", { name: /System/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".xmb-label-on")).toContainText("Motion");
  expect(originals).toEqual([]);
});

test("keeps the menu available without a graphics device", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { value: undefined });
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof context>
    ) {
      if (args[0] === "webgl2") return null;
      return context.apply(this, args);
    } as typeof context;
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".xmb-label-on")).toContainText("Theme Settings");
});

test("freezes the ambient scene when reduced motion is enabled", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.clock.install({ time: new Date("2026-09-17T12:00:00") });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(2000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(300);
  const rect = await page.locator(".vsh-canvas").boundingBox();
  if (rect === null) throw new Error("Canvas is missing.");
  const first = await page.screenshot({ clip: rect });
  await page.clock.runFor(400);
  expect(await page.screenshot({ clip: rect })).toEqual(first);
  await page.clock.resume();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".xmb-label-on")).toContainText("Theme Settings");
});

test("keeps the two navigation axes on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?gl=webgl");
  await expect(page.getByRole("status")).toHaveText("Ready.");
  await page.evaluate(() => {
    const send = (type: string, x: number, y: number): void => {
      const event = new Event(type);
      Object.defineProperty(event, "changedTouches", {
        value: [{ clientX: x, clientY: y }],
      });
      window.dispatchEvent(event);
    };
    send("touchstart", 300, 400);
    send("touchend", 100, 400);
  });
  await expect(page.locator(".xmb-label-on")).toContainText("Theme Settings");
  const box = await page.locator(".xmb-label-on").boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/shell-mobile.png" });
});
