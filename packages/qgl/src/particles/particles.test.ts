import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { QglFrame } from "../frame.js";
import type { Part, Preset } from "../preset.js";
import { bgOf, hdrOf, lineOf, partOf } from "../preset.js";
import { STEX_H, STEX_W, type Lattice } from "../lines/spline.js";
import { MAX_PARTICLES, PARTICLE_FLOATS, Particles } from "./view.js";
import { ParticleSimulation, STATE_FLOATS } from "./sim.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../resources/qgl");
const preset = JSON.parse(
  readFileSync(resolve(root, "presets/night.json"), "utf8"),
) as Preset;
const still: Part = {
  ...partOf(preset),
  emitProb: 1,
  emitPerFrame: 1,
  emitConeAngle: 0,
  emitNegProb: 0,
  emitVelMin: 1,
  emitVelMul: 0,
  agingSpeed: 0.005,
  agingVariance: 0,
  friction: 0,
  gravity: 0,
  brownianScale: 0,
  windScale: 0,
};