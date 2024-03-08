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