import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { iconMaterialOf, iconThemeColor, shadeIcon } from "./icontex.js";
import type { IconAmbientPalette, IconTexture } from "./icontex.js";

function image(pixels: number[], width = 1): ImageData {
  return {
    data: new Uint8ClampedArray(pixels),
    width,
    height: pixels.length / (width * 4),
    colorSpace: "srgb",
  };
}

describe("icon environment material", () => {
  it("preserves the source coverage and transparent pixels", () => {
    const normal = image([128, 128, 255, 150, 22, 33, 44, 0], 2);
    shadeIcon(
      normal,
      undefined,
      image([255, 255, 255, 255]),
      iconMaterialOf({}, { supersample: false }),
    );
    expect(normal.data[3]).toBe(150);
    expect([...normal.data.slice(4)]).toEqual([22, 33, 44, 0]);
  });

  it("adds the reflected environment before exposure", () => {
    const dark = image([128, 128, 255, 255]);
    const reflected = image([128, 128, 255, 255]);
    shadeIcon(dark, undefined, image([0, 0, 0, 255]));
    shadeIcon(reflected, undefined, image([255, 0, 0, 255]));
    expect(reflected.data[0]).toBeGreaterThan(dark.data[0] ?? 0);
    expect(reflected.data[1]).toBe(dark.data[1]);
    expect(reflected.data[2]).toBe(dark.data[2]);
  });

  it("samples the diffuse texture at the texel center with linear filtering", () => {
    const mixed = image([128, 128, 255, 255]);
    const uniform = image([128, 128, 255, 255]);
    shadeIcon(mixed, image([0, 0, 0, 255, 254, 254, 254, 255], 2), undefined);
    shadeIcon(uniform, image([127, 127, 127, 255]), undefined);
    expect([...mixed.data]).toEqual([...uniform.data]);
  });

  it("uses positive diffuse light before background modulation", () => {
    const dark = image([128, 128, 255, 255]);
    const lit = image([128, 128, 255, 255]);
    const material = iconMaterialOf(
      { timeColorMix: 0 },
      { background: image([255, 255, 255, 255]), supersample: false },
    );
    shadeIcon(dark, image([0, 0, 0, 255]), undefined, material);
    shadeIcon(lit, image([255, 255, 255, 255]), undefined, material);
    expect(lit.data[0]).toBeGreaterThan(dark.data[0] ?? 0);
  });

  it("decodes normal Z from red and green instead of the blue channel", () => {
    const a = image([152, 112, 0, 255]);
    const b = image([152, 112, 255, 255]);
    shadeIcon(a, undefined, undefined);
    shadeIcon(b, undefined, undefined);
    expect([...a.data]).toEqual([...b.data]);
  });

  it("responds to the draw eye and exposure without changing coverage", () => {
    const a = image([128, 128, 255, 255]);
    const b = image([128, 128, 255, 255]);
    const c = image([128, 128, 255, 255]);
    shadeIcon(
      a,
      undefined,
      undefined,
      iconMaterialOf({}, { eye: [-600, -100, 1200, 80] }),
    );
    shadeIcon(
      b,
      undefined,
      undefined,
      iconMaterialOf({}, { eye: [600, -100, 1200, 80] }),
    );
    shadeIcon(c, undefined, undefined, iconMaterialOf({ expose: 0 }));
    expect([...a.data]).not.toEqual([...b.data]);
    expect([...c.data]).toEqual([0, 0, 0, 255]);
  });

  it("uses the captured fixed LOD with trilinear background filtering", () => {
    const background = grid(4, 4, (x, y) => {
      const value = ((x + y) % 2) * 255;
      return [value, value, value, 255];
    });
    const parameters = { refrScl: 0, glass: 0, timeColorMix: 0 };
    const state = {
      supersample: false,
      screen: [0.125, 0.125, 0, 0],
    } as const;
    const actual = image([128, 128, 255, 255]);
    const expected = image([128, 128, 255, 255]);
    const material = iconMaterialOf(parameters, { ...state, background });
    expect(material.backgroundLod).toBe(30 / 256);
    const value = 0.5 * (30 / 256);
    const filtered: IconTexture = {
      data: new Float32Array([value, value, value, 1]),
      width: 1,
      height: 1,
    };
    shadeIcon(actual, undefined, undefined, material);
    shadeIcon(
      expected,
      undefined,
      undefined,
      iconMaterialOf(
        { ...parameters, refrBlur: 0 },
        { ...state, background: filtered },
      ),
    );
    expect([...actual.data]).toEqual([...expected.data]);
  });
});
