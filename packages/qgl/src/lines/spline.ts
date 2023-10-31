export * from "./basis.js";
export * from "./tune.js";

import type { Line } from "../preset.js";
import type { Lattice } from "./tune.js";

import { basis, derivative } from "./basis.js";
import {
  ASPECT,
  BASIS_SIZE,
  COMPONENTS,
  CONTROL_SIZE,
  EDGE_PUSH,
  EDGE_SMOOTHING,
  EDGE_Y_RATE,
  EDGE_Z_RATE,
  FAR,
  FFD,
  FFD_D,
  FFD_FADE_STEP,
  FFD_MAX,
  FFD_TIME_SCALE,
  FFD_W,
  FIXED_HZ,
  FOVY,
  HASH_CUBIC,
  HASH_LINEAR,
  HASH_OFFSET,
  HASH_SCALE,
  HASH_SHIFT,
  MAX_FRAME_GAP,
  NEAR,
  SPANS,
  SPRING_SECOND_NEIGHBOR,
  STEX_H,
  STEX_W,
  TIME_RESET,
  TIME_SCALE,
} from "./tune.js";

export class Spline {
  readonly wid = STEX_W;
  readonly hgt = STEX_H;
  readonly #rest = new Float32Array(CONTROL_SIZE * CONTROL_SIZE * COMPONENTS);
  readonly #seedVelocity = new Float32Array(this.#rest.length);
  readonly #position = new Float32Array(this.#rest.length);
  readonly #previous = new Float32Array(this.#rest.length);
  readonly #velocity = new Float32Array(this.#rest.length);
  readonly #control = new Float32Array(this.#rest.length);
  readonly #rows = new Float32Array(CONTROL_SIZE * STEX_W * COMPONENTS);
  readonly #rowDerivatives = new Float32Array(this.#rows.length);
  readonly #dat = new Float32Array(STEX_W * STEX_H * COMPONENTS);
  readonly #normals = new Float32Array(this.#dat.length);
  readonly #weights = new Float32Array(STEX_W * BASIS_SIZE);
  readonly #derivatives = new Float32Array(this.#weights.length);
  readonly #tangents = new Float32Array(COMPONENTS * 2);
  readonly #indices = new Uint8Array(STEX_W);
  readonly #ffdX = new Float32Array(FFD_W);
  readonly #ffdY = new Float32Array(FFD_W * FFD_D);
  readonly #ffdWeights = new Float32Array(BASIS_SIZE * 2);
  readonly #phaseMs: number;
  #elapsedMs = 0;
  #accumulator = 0;
  #time = 0;
  #previousFfdTime = 0;
  #ffdBlend = 0;
  #smoothTime = 0;
  #randomIndex = 0;
  #initialized = false;

  constructor(lattice: Lattice) {
    if (
      lattice.width !== CONTROL_SIZE ||
      lattice.height !== CONTROL_SIZE ||
      lattice.points.length !== this.#rest.length ||
      !lattice.points.every(Number.isFinite) ||
      lattice.velocities.length !== this.#rest.length ||
      !lattice.velocities.every(Number.isFinite) ||
      (lattice.phaseMs !== undefined &&
        (!Number.isFinite(lattice.phaseMs) || lattice.phaseMs < 0))
    ) {
      throw new Error("Invalid wave control lattice.");
    }
    this.#rest.set(lattice.points);
    this.#seedVelocity.set(lattice.velocities);
    this.#position.set(this.#rest);
    this.#previous.set(this.#rest);
    this.#velocity.set(this.#seedVelocity);
    this.#phaseMs = lattice.phaseMs ?? 0;
    for (let i = 0; i < STEX_W; i += 1) {
      const u = (i * SPANS) / STEX_W;
      this.#indices[i] = Math.floor(u);
      basis(u - Math.floor(u), this.#weights, i * BASIS_SIZE);
      derivative(u - Math.floor(u), this.#derivatives, i * BASIS_SIZE);
    }
  }

  get dat(): Float32Array<ArrayBuffer> {
    return this.#dat;
  }

  get normals(): Float32Array<ArrayBuffer> {
    return this.#normals;
  }

  #random(): number {
    this.#randomIndex = (this.#randomIndex + 1) | 0;
    const n = (this.#randomIndex << HASH_SHIFT) ^ this.#randomIndex;
    const hash =
      Math.imul(n, Math.imul(n, Math.imul(n, HASH_CUBIC)) + HASH_LINEAR) + HASH_OFFSET;
    return 1 - (hash & 0x7fffffff) / HASH_SCALE;
  }

  #spring(a: number, b: number, length: number, tension: number): void {
    const dx = (this.#position[b] ?? 0) - (this.#position[a] ?? 0);
    const dy = (this.#position[b + 1] ?? 0) - (this.#position[a + 1] ?? 0);
    const dz = (this.#position[b + 2] ?? 0) - (this.#position[a + 2] ?? 0);
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance === 0) return;
    const force = ((distance - length) * tension) / distance;
    const fx = dx * force;
    const fy = dy * force;
    const fz = dz * force;
    this.#velocity[a] = (this.#velocity[a] ?? 0) + fx;
    this.#velocity[a + 1] = (this.#velocity[a + 1] ?? 0) + fy;
    this.#velocity[a + 2] = (this.#velocity[a + 2] ?? 0) + fz;
    this.#velocity[b] = (this.#velocity[b] ?? 0) - fx;
    this.#velocity[b + 1] = (this.#velocity[b + 1] ?? 0) - fy;
    this.#velocity[b + 2] = (this.#velocity[b + 2] ?? 0) - fz;
  }

  #tick(line: Line): void {
    this.#previous.set(this.#position);
    const dt = line.timestep * TIME_SCALE;
    this.#time += dt;
    this.#previousFfdTime += dt * FFD_TIME_SCALE;
    this.#ffdBlend = Math.max(0, this.#ffdBlend - FFD_FADE_STEP);
    if (this.#time > TIME_RESET) {
      this.#previousFfdTime = this.#time * FFD_TIME_SCALE;
      this.#time = 0;
      this.#ffdBlend = 1;
    }
    const length = line.length;
    const tension = line.tension;
    for (let r = 0; r < CONTROL_SIZE; r += 1) {
      for (let c = 0; c < CONTROL_SIZE; c += 1) {
        const a = (r * CONTROL_SIZE + c) * COMPONENTS;
        if (c > 0) this.#spring(a, a - COMPONENTS, length, tension);
        if (c > 1)
          this.#spring(
            a,
            a - COMPONENTS * 2,
            length * 2,
            tension * SPRING_SECOND_NEIGHBOR,
          );
        if (r > 0) this.#spring(a, a - CONTROL_SIZE * COMPONENTS, length, tension);
        if (r > 1) {
          this.#spring(
            a,
            a - CONTROL_SIZE * COMPONENTS * 2,
            length * 2,
            tension * SPRING_SECOND_NEIGHBOR,
          );
        }
        for (let k = 0; k < 3; k += 1) {
          this.#velocity[a + k] =
            (this.#velocity[a + k] ?? 0) + this.#random() * line.perturbation;
        }
      }
    }
    const decay = 1 - line.damping * line.timestep;
    for (let i = 0; i < this.#position.length; i += COMPONENTS) {
      for (let k = 0; k < 3; k += 1) {
        this.#position[i + k] =
          (this.#position[i + k] ?? 0) + (this.#velocity[i + k] ?? 0) * dt;
        this.#velocity[i + k] = (this.#velocity[i + k] ?? 0) * decay;
      }
    }
    this.#smoothTime += (this.#time - this.#smoothTime) * EDGE_SMOOTHING;
    for (let r = 0; r < CONTROL_SIZE; r += 1) {
      const first = r * CONTROL_SIZE * COMPONENTS;
      this.#velocity[first] = (this.#velocity[first] ?? 0) + line.timestep * EDGE_PUSH;
      const last = first + (CONTROL_SIZE - 1) * COMPONENTS;
      const phase = r / CONTROL_SIZE + this.#smoothTime;
      this.#position[last] = 0;
      this.#position[last + 1] =
        (0.5 + 0.5 * Math.sin(EDGE_Y_RATE * phase)) * line.endY;
      this.#position[last + 2] =
        (0.5 + 0.5 * Math.cos(EDGE_Z_RATE * phase)) * line.endZ;
      this.#velocity[last] = 0;
      this.#velocity[last + 1] = 0;
      this.#velocity[last + 2] = 0;
    }
  }

  #advance(line: Line, elapsedMs: number): void {
    if (elapsedMs < this.#elapsedMs) {
      this.#position.set(this.#rest);
      this.#previous.set(this.#rest);
      this.#velocity.set(this.#seedVelocity);
      this.#time = 0;
      this.#previousFfdTime = 0;
      this.#ffdBlend = 0;
      this.#smoothTime = 0;
      this.#randomIndex = 0;
      this.#accumulator = 0;
      this.#elapsedMs = 0;
      this.#initialized = false;
    }
    if (!this.#initialized) {
      if (line.timestep > 0) {
        const ticks = Math.floor((this.#phaseMs * FIXED_HZ) / 1000);
        for (let i = 0; i < ticks; i += 1) this.#tick(line);
      }
      this.#initialized = true;
    }
    const delta = Math.min(MAX_FRAME_GAP, Math.max(0, elapsedMs - this.#elapsedMs));
    this.#elapsedMs = elapsedMs;
    if (line.timestep <= 0) return;
    this.#accumulator += (delta * FIXED_HZ) / 1000;
    const ticks = Math.floor(this.#accumulator + 1e-8);
    this.#accumulator -= ticks;
    for (let i = 0; i < ticks; i += 1) this.#tick(line);
  }

  #deform(line: Line, fovy: number): void {
    const t = this.#time * FFD_TIME_SCALE;
    const slowSine = Math.sin(t * FFD.centerRate);
    const globalRise = Math.sin(t * FFD.riseRate) * 0.5;
    const amplitude =
      (Math.sin(t * FFD.amplitudeRate) + FFD.amplitudeBias) *
      Math.exp(-t * FFD.timeDecay);
    const oldTime = this.#previousFfdTime;
    const oldSlowSine = Math.sin(oldTime * FFD.centerRate);
    const oldRise = Math.sin(oldTime * FFD.riseRate) * 0.5;
    const oldAmplitude =
      (Math.sin(oldTime * FFD.amplitudeRate) + FFD.amplitudeBias) *
      Math.exp(-oldTime * FFD.timeDecay);
    for (let x = 0; x < FFD_W; x += 1) {
      const u = x / FFD_W;
      this.#ffdX[x] =
        (FFD.xLinear * u + FFD.xQuadratic * u * u - FFD.xOffset) * line.ffdScale1X +
        line.ffdOffsetX;
      const envelope =
        (Math.tanh(u - 0.5) * FFD.envelopeScale + FFD.envelopeScale) * amplitude;
      const gaussian = u - (slowSine + FFD.xLinear) * FFD.centerScale;
      const ridge =
        envelope * Math.sin(u * FFD.waveSpan - t * FFD.waveRate - FFD.waveOffset) +
        globalRise +
        Math.exp(-FFD.gaussian * gaussian * gaussian);
      const oldEnvelope =
        (Math.tanh(u - 0.5) * FFD.envelopeScale + FFD.envelopeScale) * oldAmplitude;
      const oldGaussian = u - (oldSlowSine + FFD.xLinear) * FFD.centerScale;
      const oldRidge =
        oldEnvelope *
          Math.sin(u * FFD.waveSpan - oldTime * FFD.waveRate - FFD.waveOffset) +
        oldRise +
        Math.exp(-FFD.gaussian * oldGaussian * oldGaussian);
      for (let z = 0; z < FFD_D; z += 1) {
        const current =
          ridge + Math.sin(t - (z / FFD_D) * FFD.twistSpan) * FFD.twistAmplitude;
        const previous =
          oldRidge +
          Math.sin(oldTime - (z / FFD_D) * FFD.twistSpan) * FFD.twistAmplitude;
        this.#ffdY[z * FFD_W + x] =
          (current * (1 - this.#ffdBlend) + previous * this.#ffdBlend) *
            line.ffdScale1Y +
          line.ffdOffsetY;
      }
    }
    const axisLength = Math.hypot(line.angX, line.angY, line.angZ) || 1;
    const ax = line.angX / axisLength;
    const ay = line.angY / axisLength;
    const az = line.angZ / axisLength;
    const angle = (line.angRot * Math.PI) / 180;
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    const ic = 1 - cs;
    const focal = 1 / Math.tan((fovy * Math.PI) / 360);
    const depthScale = (FAR + NEAR) / (NEAR - FAR);
    const depthOffset = (2 * FAR * NEAR) / (NEAR - FAR);
    const alpha = Math.max(0, this.#accumulator);
    for (let o = 0; o < this.#control.length; o += COMPONENTS) {
      const px =
        (this.#previous[o] ?? 0) * (1 - alpha) + (this.#position[o] ?? 0) * alpha;
      const py =
        (this.#previous[o + 1] ?? 0) * (1 - alpha) +
        (this.#position[o + 1] ?? 0) * alpha;
      const pz =
        (this.#previous[o + 2] ?? 0) * (1 - alpha) +
        (this.#position[o + 2] ?? 0) * alpha;
      const distance = px - line.ffdParam1;
      const ramp = Math.max(0, Math.min(1, distance / FFD.taperLength));
      const taper =
        FFD.xQuadratic -
        Math.cos((Math.max(0, distance) * Math.PI) / 2) *
          (1 - ramp) *
          (1 - ramp) *
          (1 + 2 * ramp);
      const qx = (px - line.ffdOffsetX) / line.ffdScale1X;
      const qy = (py * taper - line.ffdOffsetY) / line.ffdScale1Y;
      const qz = (pz * taper - line.ffdOffsetZ) / line.ffdScale1Z;
      const u = Math.max(0, Math.min(FFD_MAX, qx)) * FFD_W;
      const w = Math.max(0, Math.min(FFD_MAX, qz)) * FFD_D;
      const ix = Math.floor(u);
      const iz = Math.floor(w);
      basis(u - ix, this.#ffdWeights);
      basis(w - iz, this.#ffdWeights, BASIS_SIZE);
      let dx = 0;
      let dy = 0;
      for (let i = 0; i < BASIS_SIZE; i += 1) {
        const x = Math.max(0, Math.min(FFD_W - 1, ix + i - 1));
        const wx = this.#ffdWeights[i] ?? 0;
        dx += (this.#ffdX[x] ?? 0) * wx;
        for (let k = 0; k < BASIS_SIZE; k += 1) {
          const z = Math.max(0, Math.min(FFD_D - 1, iz + k - 1));
          dy +=
            (this.#ffdY[z * FFD_W + x] ?? 0) *
            wx *
            (this.#ffdWeights[BASIS_SIZE + k] ?? 0);
        }
      }
      const x = (qx + dx) * line.ffdScale2X;
      const y = (qy + dy) * line.ffdScale2Y;
      const z = (qz + line.ffdOffsetZ) * line.ffdScale2Z;
      const vx =
        (cs + ax * ax * ic) * x +
        (ax * ay * ic - az * sn) * y +
        (ax * az * ic + ay * sn) * z +
        line.posX;
      const vy =
        (ay * ax * ic + az * sn) * x +
        (cs + ay * ay * ic) * y +
        (ay * az * ic - ax * sn) * z +
        line.posY;
      const vz =
        (az * ax * ic - ay * sn) * x +
        (az * ay * ic + ax * sn) * y +
        (cs + az * az * ic) * z +
        line.posZ;
      this.#control[o] = (vx * focal) / ASPECT;
      this.#control[o + 1] = vy * focal;
      this.#control[o + 2] = vz * depthScale + depthOffset;
      this.#control[o + 3] = -vz;
    }
  }

  write(line: Line, elapsedMs: number, fovy = FOVY): Float32Array<ArrayBuffer> {
    this.#advance(line, elapsedMs);
    this.#deform(line, fovy);

    for (let r = 0; r < CONTROL_SIZE; r += 1) {
      for (let c = 0; c < STEX_W; c += 1) {
        const start = (r * CONTROL_SIZE + (this.#indices[c] ?? 0)) * COMPONENTS;
        const dest = (r * STEX_W + c) * COMPONENTS;
        for (let k = 0; k < COMPONENTS; k += 1) {
          let value = 0;
          let tangent = 0;
          for (let j = 0; j < BASIS_SIZE; j += 1) {
            const control = this.#control[start + j * COMPONENTS + k] ?? 0;
            value += control * (this.#weights[c * BASIS_SIZE + j] ?? 0);
            tangent += control * (this.#derivatives[c * BASIS_SIZE + j] ?? 0);
          }
          this.#rows[dest + k] = value;
          this.#rowDerivatives[dest + k] = tangent;
        }
      }
    }

    for (let r = 0; r < STEX_H; r += 1) {
      for (let c = 0; c < STEX_W; c += 1) {
        const start = ((this.#indices[r] ?? 0) * STEX_W + c) * COMPONENTS;
        const dest = (r * STEX_W + c) * COMPONENTS;
        for (let k = 0; k < COMPONENTS; k += 1) {
          let value = 0;
          let du = 0;
          let dv = 0;
          for (let j = 0; j < BASIS_SIZE; j += 1) {
            const source = start + j * STEX_W * COMPONENTS + k;
            const weight = this.#weights[r * BASIS_SIZE + j] ?? 0;
            const row = this.#rows[source] ?? 0;
            value += row * weight;
            du += (this.#rowDerivatives[source] ?? 0) * weight;
            dv += row * (this.#derivatives[r * BASIS_SIZE + j] ?? 0);
          }
          this.#dat[dest + k] = value;
          this.#tangents[k] = du;
          this.#tangents[k + COMPONENTS] = dv;
        }
        const ux = this.#tangents[0] ?? 0;
        const uy = this.#tangents[1] ?? 0;
        const uz = this.#tangents[2] ?? 0;
        const vx = this.#tangents[4] ?? 0;
        const vy = this.#tangents[5] ?? 0;
        const vz = this.#tangents[6] ?? 0;
        this.#normals[dest] = vy * uz - vz * uy;
        this.#normals[dest + 1] = vz * ux - vx * uz;
        this.#normals[dest + 2] = vx * uy - vy * ux;
      }
    }
    return this.#dat;
  }
}
