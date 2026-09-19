import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe.each(["/", "/xmb-test-portfolio/"])("hosting at %s", (base) => {
  it("maps resources and routes without changing external URLs", async () => {
    vi.stubEnv("BASE_URL", base);
    const { appUrl } = await import("./path.js");
    expect(appUrl("/xmb/icons/network.png")).toBe(`${base}xmb/icons/network.png`);
    expect(appUrl("/work/nos4")).toBe(`${base}work/nos4`);
    expect(appUrl(`${base}user`)).toBe(`${base}user`);
    for (const url of [
      "https://nos4.fun",
      "//example.com/image.png",
      "data:image/png;base64,AA",
      "blob:test",
    ]) {
      expect(appUrl(url)).toBe(url);
    }
  });

  it("normalizes directory routes from static hosts", async () => {
    vi.stubEnv("BASE_URL", base);
    const { appPath } = await import("./path.js");
    expect(appPath(base)).toBe("/");
    expect(appPath(`${base}user/`)).toBe("/user");
    expect(appPath(`${base}work/nos4/`)).toBe("/work/nos4");
    expect(appPath(`${base}work/nos4`)).toBe("/work/nos4");
  });
});
