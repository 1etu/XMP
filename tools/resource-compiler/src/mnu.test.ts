import { describe, expect, it } from "vitest";

import * as Mnu from "./mnu.ts";

const HDR = "#MNU_1.0";

describe("parse", () => {
  it("reads typed scalars", () => {
    const block = Mnu.parse(
      [HDR, "EXPOSURE:float:1.05", "TEX SIZE:int:8", "GLARE:int:1"].join("\n"),
    );

    expect(block).toEqual({ EXPOSURE: 1.05, "TEX SIZE": 8, GLARE: 1 });
  });

  it("keeps leading zeros and stray whitespace out of the value", () => {
    const block = Mnu.parse([HDR, "SPACING:float:007.658", ""].join("\n"));

    expect(block["SPACING"]).toBeCloseTo(7.658, 6);
  });

  it("keeps keys that contain spaces and underscores verbatim", () => {
    const block = Mnu.parse(
      [HDR, "FFD SCALE1 X:float:5.67726", "near focus_dist:float:1.3193"].join("\n"),
    );

    expect(Object.keys(block)).toEqual(["FFD SCALE1 X", "near focus_dist"]);
  });

  it("rejects a foreign header", () => {
    expect(() => Mnu.parse("#MNU_2.0\nA:int:1")).toThrow(Mnu.FormatError);
  });

  it("yields an empty block when only the header is present", () => {
    expect(Mnu.parse(HDR)).toEqual({});
  });
});

describe("kinds", () => {
  it("keeps the declared type of each entry", () => {
    const k = Mnu.kinds(
      [HDR, "EXPOSURE:float:1.05", "TEX SIZE:int:8"].join("\n"),
    );

    expect(k).toEqual({ EXPOSURE: "float", "TEX SIZE": "int" });
  });

  it("treats an unfamiliar type as float", () => {
    expect(Mnu.kinds([HDR, "A:vector:1"].join("\n"))["A"]).toBe("float");
  });
});

describe("slices", () => {
  it("returns the raw text of each block", () => {
    const dat = Buffer.from(`${HDR}\nA:int:1`, "latin1");

    expect(Mnu.slices(dat)).toEqual([`${HDR}\nA:int:1`]);
  });
});

describe("extract", () => {
  it("splits blocks separated by a terminator", () => {
    const nul = Buffer.from([0]);
    const dat = Buffer.concat([
      Buffer.from(`${HDR}
A:int:1`, "latin1"),
      nul,
      nul,
      Buffer.from(`${HDR}
B:int:2`, "latin1"),
      nul,
    ]);

    expect(Mnu.extract(dat)).toEqual([{ A: 1 }, { B: 2 }]);
  });

  it("stops a block at its terminator, not at the next header", () => {
    const dat = Buffer.concat([
      Buffer.from(`${HDR}
A:int:1`, "latin1"),
      Buffer.from([0]),
      Buffer.from("B:int:2", "latin1"),
    ]);

    expect(Mnu.extract(dat)).toEqual([{ A: 1 }]);
  });

  it("splits blocks stored back to back without a terminator", () => {
    const dat = Buffer.from(`${HDR}\nA:int:1\n${HDR}\nB:int:2`, "latin1");

    expect(Mnu.extract(dat)).toEqual([{ A: 1 }, { B: 2 }]);
  });

  it("returns nothing when no block is present", () => {
    expect(Mnu.extract(Buffer.from("no markers here", "latin1"))).toEqual([]);
  });
});
