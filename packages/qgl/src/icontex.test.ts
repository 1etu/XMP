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

function grid(
  width: number,
  height: number,
  color: (x: number, y: number) => readonly number[],
): ImageData {
  const pixels: number[] = [];
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) pixels.push(...color(x, y));
  return image(pixels, width);
}

describe("native firmware 3.00 icon vectors", () => {
  const cases = [
    [
      false,
      [
        144, 111, 142, 255, 149, 116, 144, 255, 141, 101, 131, 255, 154, 127, 151, 255,
        160, 135, 155, 255, 143, 107, 133, 255, 154, 128, 150, 255, 160, 137, 155, 255,
        142, 107, 131, 255,
      ],
    ],
    [
      true,
      [
        146, 114, 144, 255, 149, 116, 144, 255, 142, 103, 133, 255, 154, 128, 152, 255,
        158, 132, 153, 255, 145, 110, 135, 255, 155, 131, 152, 255, 159, 134, 153, 255,
        145, 111, 134, 255,
      ],
    ],
  ] as const;

  it.each(cases)(
    "matches the no-shadow fragment program with full sampling %s",
    (supersample, expected) => {
      const normal = grid(3, 3, (x, y) => [
        96 + x * 24,
        112 + y * 16,
        30 + x * 70,
        255,
      ]);
      const diffuse = grid(4, 4, (x, y) => [102 + x * 17, 76 + y * 13, 128, 255]);
      const environment = grid(4, 4, (x, y) => [32 + x * 20, 16 + y * 20, 64, 255]);
      const background = grid(4, 4, (x, y) => [
        80 + x * 20,
        40 + y * 10,
        50 + (x + y) * 10,
        255,
      ]);
      const material = iconMaterialOf(
        { refrBlur: 0 },
        { background, supersample, screen: [0.2, 0.3, 0.2, 0.15] },
      );
      shadeIcon(normal, diffuse, environment, material);
      expect([...normal.data]).toEqual(expected);
    },
  );

  it("builds the captured luminance polynomial from the glass parameter", () => {
    const material = iconMaterialOf({ glass: 0.152523 });
    expect(material.luminance[0][2]).toBeCloseTo(-0.415340155363, 6);
    expect(material.luminance[1][2]).toBeCloseTo(0.255999624729, 6);
    expect(material.luminance[2][2]).toBe(0);
  });
});

describe("native icon theme palette", () => {
  const palette = JSON.parse(
    readFileSync(
      new URL("../../../resources/qgl/icons/ambient-palette.json", import.meta.url),
      "utf8",
    ),
  ) as IconAmbientPalette;

  it("selects the September midnight purple and midday color", () => {
    expect(iconThemeColor(palette, 0, 8)).toEqual([230 / 255, 160 / 255, 238 / 255]);
    expect(iconThemeColor(palette, 0.5, 8)).toEqual([
      247 / 255,
      223.5 / 255,
      249.5 / 255,
    ]);
  });

  it("wraps both calendar axes and interpolates between months", () => {
    expect(iconThemeColor(palette, 1, 20)).toEqual(iconThemeColor(palette, 0, 8));
    expect(iconThemeColor(palette, 0, 8.5)).toEqual([
      236 / 255,
      187 / 255,
      142.5 / 255,
    ]);
  });
});
