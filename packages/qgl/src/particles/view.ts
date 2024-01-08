import { measured, verified } from "@vsh/resource";
import type { QglFrame } from "../frame.js";
import { Spline } from "../lines/spline.js";
import {
  CAMERA_Z,
  LIFE_BOUND,
  MAX_PARTICLES,
  ParticleSimulation,
  STATE_FLOATS,
} from "./sim.js";

export { MAX_PARTICLES } from "./sim.js";
export const PARTICLE_FLOATS = 16;
const ASPECT = measured(16 / 9);
const DISPLAY_GAIN = measured(0.8);
const LIFE_FADE_IN = verified(0.02);
const LIFE_FADE_OUT = verified(0.94);
const LIFE_FADE_OUT_GAIN = verified(16.6666667);
const BOUND_FADE = verified(5);
const FOCUS_BAND = verified(0.2);
const FOCUS_BAND_COUNT = verified(3);
const BASE_FUZZINESS = verified(0.85);
const FIXED_HZ = verified(60);

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export class Particles {
  readonly #data = new Float32Array(MAX_PARTICLES * PARTICLE_FLOATS);
  #simulation = new ParticleSimulation();
  #iridescence: ImageData | undefined;
  #warmupDone = false;
  #started = false;
  #elapsedOffset = 0;
  #shiftedFrame:
    | { no: number; deltaMs: number; elapsedMs: number; scene: QglFrame["scene"] }
    | undefined;

  async load(signal?: AbortSignal): Promise<void> {
    if (!(import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) return;
    let image: ImageBitmap;
    try {
      const response = await fetch("/original/particle/proc-iridescent.png", {
        signal: signal ?? null,
      });
      if (!response.ok) return;
      image = await createImageBitmap(await response.blob());
    } catch (error) {
      if (signal?.aborted) throw error;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context !== null) {
      context.drawImage(image, 0, 0);
      this.#iridescence = context.getImageData(0, 0, canvas.width, canvas.height);
    }
    image.close();
  }

  #sample(u: number, v: number, channel: number): number {
    const image = this.#iridescence;
    if (image === undefined) return 1;
    const x = Math.max(0, Math.min(image.width - 1, u * image.width - 0.5));
    const y = Math.max(0, Math.min(image.height - 1, v * image.height - 0.5));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(image.width - 1, x0 + 1);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const a = image.data[(y0 * image.width + x0) * 4 + channel] ?? 0;
    const b = image.data[(y0 * image.width + x1) * 4 + channel] ?? 0;
    const c = image.data[(y1 * image.width + x0) * 4 + channel] ?? 0;
    const d = image.data[(y1 * image.width + x1) * 4 + channel] ?? 0;
    return (a + (b - a) * tx + (c + (d - c) * tx - a - (b - a) * tx) * ty) / 255;
  }

  write(frame: QglFrame, count: number): Float32Array<ArrayBuffer> {
    const warmup = frame.scene.particleWarmup;
    if (!this.#started && !this.#warmupDone && warmup !== undefined) {
      this.#warmupDone = true;
      this.#simulation = new ParticleSimulation();
      const history = new Spline({ ...warmup.lattice, phaseMs: 0 });
      const historyFrame = {
        ...frame,
        elapsedMs: 0,
        scene: { ...frame.scene, spline: history.dat, normals: history.normals },
      };
      const ticks = Math.round((warmup.durationMs * FIXED_HZ) / 1000);
      for (let tick = 0; tick <= ticks; tick += 1) {
        historyFrame.elapsedMs = (tick * 1000) / FIXED_HZ;
        history.write(frame.scene.line, historyFrame.elapsedMs, frame.scene.bg.fovy);
        this.#simulation.advance(historyFrame);
      }
      this.#elapsedOffset = historyFrame.elapsedMs;
      this.#shiftedFrame = {
        ...frame,
        elapsedMs: frame.elapsedMs + this.#elapsedOffset,
      };
    }
    this.#started = true;
    if (this.#shiftedFrame === undefined) {
      this.#simulation.advance(frame);
    } else {
      this.#shiftedFrame.no = frame.no;
      this.#shiftedFrame.deltaMs = frame.deltaMs;
      this.#shiftedFrame.elapsedMs = frame.elapsedMs + this.#elapsedOffset;
      this.#shiftedFrame.scene = frame.scene;
      this.#simulation.advance(this.#shiftedFrame);
    }
    this.#data.fill(0);
    const p = frame.scene.part;
    const focal = 1 / Math.tan((frame.scene.bg.fovy * Math.PI) / 360);
    const state = this.#simulation.state;
    const previous = this.#simulation.previous;
    const blend = this.#simulation.blend;
    const available = Math.max(0, Math.min(MAX_PARTICLES, count));
    let written = 0;
    for (let i = 0; i < MAX_PARTICLES && written < available; i += 1) {
      const s = i * STATE_FLOATS;
      if ((state[s + 3] ?? -1) < 0) continue;
      const x = (previous[s] ?? 0) * (1 - blend) + (state[s] ?? 0) * blend;
      const y = (previous[s + 1] ?? 0) * (1 - blend) + (state[s + 1] ?? 0) * blend;
      const z = (previous[s + 2] ?? 0) * (1 - blend) + (state[s + 2] ?? 0) * blend;
      const depth = CAMERA_Z - z;
      if (depth <= 0) continue;
      const age = (previous[s + 3] ?? 0) * (1 - blend) + (state[s + 3] ?? 0) * blend;
      let qx = (previous[s + 8] ?? 0) * (1 - blend) + (state[s + 8] ?? 0) * blend;
      let qy = (previous[s + 9] ?? 0) * (1 - blend) + (state[s + 9] ?? 0) * blend;
      let qz = (previous[s + 10] ?? 0) * (1 - blend) + (state[s + 10] ?? 0) * blend;
      let qw = (previous[s + 11] ?? 1) * (1 - blend) + (state[s + 11] ?? 1) * blend;
      let ql = Math.hypot(qx, qy, qz, qw) || 1;
      qx /= ql;
      qy /= ql;
      qz /= ql;
      qw /= ql;
      const nx = 2 * (qx * qz + qy * qw);
      const ny = 2 * (qy * qz - qx * qw);
      const nz = 1 - 2 * (qx * qx + qy * qy);
      const distance = Math.hypot(x, y, depth);
      const nearLinear = clamp(
        (p.nearFocus + p.nearFocusDist - distance) /
          Math.max(p.nearFocusDist, Number.EPSILON),
      );
      const farLinear = clamp(
        (distance - p.farFocus) / Math.max(p.farFocusDist, Number.EPSILON),
      );
      const near = Math.pow(nearLinear, p.nearFocusPow);
      const far = Math.pow(farLinear, p.farFocusPow);
      const sizeNear = p.sizeMiddle + (p.sizeNear - p.sizeMiddle) * near;
      const size = sizeNear + (p.sizeFar - sizeNear) * far;
      const angle =
        (2 * Math.atan(size / distance)) / ((frame.scene.bg.fovy * Math.PI) / 180);
      const band = clamp((distance - p.farFocus + FOCUS_BAND * 2) / FOCUS_BAND);
      const bandAlpha =
        1 +
        clamp((distance - p.farFocus + FOCUS_BAND) / FOCUS_BAND) -
        clamp((distance - p.farFocus + FOCUS_BAND * FOCUS_BAND_COUNT) / FOCUS_BAND);
      const alignment = clamp(near * p.nearAlign + angle * p.sizeAlign + band);
      qx *= 1 - alignment;
      qy *= 1 - alignment;
      qz *= 1 - alignment;
      qw += (1 - qw) * alignment;
      ql = Math.hypot(qx, qy, qz, qw) || 1;
      qx /= ql;
      qy /= ql;
      qz /= ql;
      qw /= ql;
      const ux = 1 - 2 * (qy * qy + qz * qz);
      const uy = 2 * (qx * qy + qw * qz);
      const uz = 2 * (qx * qz - qw * qy);
      const tx = 2 * (qx * qy - qw * qz);
      const ty = 1 - 2 * (qx * qx + qz * qz);
      const tz = 2 * (qy * qz + qw * qx);
      const anx = 2 * (qx * qz + qy * qw);
      const any = 2 * (qy * qz - qx * qw);
      const anz = 1 - 2 * (qx * qx + qy * qy);
      const lx0 = p.spotPosX - x;
      const ly0 = p.spotPosY - y;
      const lz0 = p.spotPosZ - z;
      const ll = Math.hypot(lx0, ly0, lz0) || 1;
      const lx = lx0 / ll;
      const ly = ly0 / ll;
      const lz = lz0 / ll;
      const vx = -x / distance;
      const vy = -y / distance;
      const vz = depth / distance;
      const hl = Math.hypot(lx + vx, ly + vy, lz + vz) || 1;
      const facing = clamp(Math.abs(anx * vx + any * vy + anz * vz));
      const diffuse = Math.abs(nx * lx + ny * ly + nz * lz) * p.lambertCoeff;
      const specularFacing = Math.pow(
        Math.abs((nx * (lx + vx) + ny * (ly + vy) + nz * (lz + vz)) / hl),
        p.specularPower,
      );
      const specular = specularFacing * p.specularCoeff;
      const life =
        (Math.min(age, LIFE_FADE_IN) / LIFE_FADE_IN) *
        (1 - Math.max(age - LIFE_FADE_OUT, 0) * LIFE_FADE_OUT_GAIN);
      const edge = clamp(
        (LIFE_BOUND - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) * BOUND_FADE,
      );
      const alpha =
        life *
        bandAlpha *
        edge *
        edge *
        (3 - 2 * edge) *
        (1 - clamp(nearLinear * angle * p.nearDarkness)) *
        (1 - clamp(farLinear * angle * p.farDarkness)) *
        p.globalAlpha;
      const coreAlpha = alpha * (1 - Math.pow(1 - facing, p.fresnel));
      const haloAlpha = alpha * (1 - Math.pow(1 - Math.abs(vz), p.fresnel));
      const attenuation = Math.max(
        Number.EPSILON,
        p.spotAttnX + ll * (p.spotAttnY + ll * p.spotAttnZ),
      );
      const radius = (size * focal) / (2 * depth);
      const o = written * PARTICLE_FLOATS;
      written += 1;
      this.#data[o] = (x * focal) / (depth * ASPECT);
      this.#data[o + 1] = (y * focal) / depth;
      this.#data[o + 2] = clamp(near + far);
      this.#data[o + 3] = BASE_FUZZINESS + near * (p.nearFuzziness - BASE_FUZZINESS);
      this.#data[o + 4] = ((ux + (x * uz) / depth) * radius) / ASPECT;
      this.#data[o + 5] = (uy + (y * uz) / depth) * radius;
      this.#data[o + 6] = ((tx + (x * tz) / depth) * radius) / ASPECT;
      this.#data[o + 7] = (ty + (y * tz) / depth) * radius;
      for (let c = 0; c < 3; c += 1) {
        const iridescence = Math.pow(
          1 + (this.#sample(nx * 0.5 + 0.5, ny * 0.5 + 0.5, c) - 1) * p.colorControl,
          p.iridescentExp,
        );
        this.#data[o + 8 + c] =
          (1 -
            Math.exp(
              (-p.exposure * (diffuse + specular * iridescence)) / attenuation,
            )) *
          DISPLAY_GAIN *
          coreAlpha;
        this.#data[o + 12 + c] =
          (1 - Math.exp((-p.exposure * specular * iridescence) / attenuation)) *
          DISPLAY_GAIN *
          haloAlpha *
          p.glare;
      }
      this.#data[o + 11] = radius;
      this.#data[o + 15] = p.glareScale * specularFacing;
    }
    return this.#data;
  }
}
