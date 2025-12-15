import { afterEach, describe, expect, it, vi } from "vitest";

import { Libpad, REPEAT } from "./index.js";

function device(mapping: GamepadMappingType, axes: readonly number[]) {
  return {
    connected: true,
    mapping,
    axes,
    buttons: [],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gamepad mapping", () => {
  it("ignores raw wheel and pedal axes", () => {
    vi.stubGlobal("navigator", {
      getGamepads: () => [device("", [0.83, -1, -1, -1])],
    });
    const pad = new Libpad();
    expect(pad.flush(0)).toEqual([]);
    expect(pad.flush(REPEAT.fastAfterMs)).toEqual([]);
    pad.dispose();
  });

  it("uses standard controls when a raw device is also connected", () => {
    vi.stubGlobal("navigator", {
      getGamepads: () => [device("", [0.83, -1]), device("standard", [0, 1])],
    });
    const pad = new Libpad();
    expect(pad.flush(0)).toEqual(["down"]);
    expect(pad.flush(REPEAT.holdMs)).toEqual(["down"]);
    pad.dispose();
  });

  it("releases standard controls after disconnection", () => {
    const controller = device("standard", [0, 1]);
    vi.stubGlobal("navigator", { getGamepads: () => [controller] });
    const pad = new Libpad();
    expect(pad.flush(0)).toEqual(["down"]);
    controller.connected = false;
    expect(pad.flush(REPEAT.fastAfterMs)).toEqual([]);
    pad.dispose();
  });
});
