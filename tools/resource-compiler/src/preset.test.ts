import { describe, expect, it } from "vitest";

import { camel } from "./preset.ts";

describe("camel", () => {
  it("folds spaced screaming case", () => {
    expect(camel("GLARE THRESH")).toBe("glareThresh");
    expect(camel("WHITE LEVEL")).toBe("whiteLevel");
  });

  it("keeps trailing digits attached to their word", () => {
    expect(camel("FFD SCALE1 X")).toBe("ffdScale1X");
    expect(camel("wind scale 10")).toBe("windScale10");
  });

  it("treats a leading digit run as its own word", () => {
    expect(camel("NIGHT2DAY BEGIN")).toBe("night2dayBegin");
  });

  it("splits on underscores", () => {
    expect(camel("GLARE_ONLY")).toBe("glareOnly");
    expect(camel("near focus_dist")).toBe("nearFocusDist");
    expect(camel("color_control")).toBe("colorControl");
  });

  it("passes a single lowercase word through", () => {
    expect(camel("friction")).toBe("friction");
  });

  it("collapses repeated separators", () => {
    expect(camel("  GLARE   SUM  POW ")).toBe("glareSumPow");
  });
});
