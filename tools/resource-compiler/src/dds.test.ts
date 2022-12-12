import { describe, expect, it } from "vitest";

import * as Dds from "./dds.ts";

const HDR_SIZE = 128;

function surface(
  wid: number,
  hgt: number,
  rmask: number,
  px: readonly (readonly number[])[],
): Buffer {
  const buf = Buffer.alloc(HDR_SIZE + wid * hgt * 4);
  buf.write("DDS ", 0, "latin1");
  buf.writeUInt32LE(124, 4);
  buf.writeUInt32LE(hgt, 0x0c);
  buf.writeUInt32LE(wid, 0x10);
  buf.writeUInt32LE(32, 0x58);
  buf.writeUInt32LE(rmask, 0x5c);

  px.forEach((p, i) => {
    const o = HDR_SIZE + i * 4;
    buf[o] = p[0] ?? 0;
    buf[o + 1] = p[1] ?? 0;
    buf[o + 2] = p[2] ?? 0;
    buf[o + 3] = p[3] ?? 0xff;
  });

  return buf;
}

describe("decode", () => {
  it("swaps blue and red for an a8r8g8b8 surface", () => {
    const buf = surface(1, 1, 0x00ff0000, [[10, 20, 30, 255]]);

    expect(Array.from(Dds.decode(buf, 0).rgba)).toEqual([30, 20, 10, 255]);
  });

  it("leaves channel order alone for an a8b8g8r8 surface", () => {
    const buf = surface(1, 1, 0x000000ff, [[10, 20, 30, 255]]);

    expect(Array.from(Dds.decode(buf, 0).rgba)).toEqual([10, 20, 30, 255]);
  });

  it("reports surface dimensions", () => {
    const img = Dds.decode(
      surface(2, 1, 0x00ff0000, [
        [0, 0, 0],
        [1, 1, 1],
      ]),
      0,
    );

    expect([img.wid, img.hgt]).toEqual([2, 1]);
  });

  it("rejects a surface that is not 32 bpp", () => {
    const buf = surface(1, 1, 0x00ff0000, [[0, 0, 0]]);
    buf.writeUInt32LE(16, 0x58);

    expect(() => Dds.decode(buf, 0)).toThrow(Dds.FormatError);
  });

  it("rejects a truncated surface", () => {
    const buf = surface(4, 4, 0x00ff0000, []).subarray(0, HDR_SIZE + 8);

    expect(() => Dds.decode(buf, 0)).toThrow(Dds.FormatError);
  });
});

describe("extract", () => {
  it("finds every surface in the buffer", () => {
    const a = surface(1, 1, 0x00ff0000, [[1, 2, 3]]);
    const b = surface(1, 1, 0x00ff0000, [[4, 5, 6]]);

    expect(Dds.extract(Buffer.concat([a, b]))).toHaveLength(2);
  });
});
