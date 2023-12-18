import { design, measured, verified } from "@vsh/resource";
import type { QglFrame } from "../frame.js";
import { STEX_H, STEX_W } from "../lines/spline.js";
import type { Part } from "../preset.js";

export const MAX_PARTICLES = verified(2048);
export const STATE_FLOATS = verified(12);
export const CAMERA_Z = verified(2);
export const LIFE_BOUND = verified(10);
const ASPECT = measured(16 / 9);
const FIXED_HZ = verified(60);
const MAX_FRAME_GAP = design(1000);
const DEAD_AGE = verified(-666);
const RETIRE_AGE = verified(0.999989986);
const MIN_AGE_RATE = verified(0.001);
const MIN_MOTION = verified(0.0001);
const TRAIL_PROBABILITY = verified(0.06);
const TRAIL_LENGTH = verified(100);
const TRAIL_VARIANCE = verified(80);
const HASH_SHIFT = verified(13);
const HASH_CUBIC = verified(15731);
const HASH_LINEAR = verified(789221);
const HASH_OFFSET = verified(1376312589);
const HASH_SCALE = verified(1073741824);
const BROWNIAN_MULTIPLIER = verified(16807);
const BROWNIAN_X = verified(0x98756161);
const BROWNIAN_Y = verified(0x21324889);
const BROWNIAN_Z = verified(0x82181158);
const SPIN_X = verified(0.37);
const SPIN_Y = verified(0.17);
const SPIN_Z = verified(0.31);
const TWO_PI = verified(6.283185005);

export class ParticleSimulation {
  readonly state = new Float32Array(MAX_PARTICLES * STATE_FLOATS);
  readonly previous = new Float32Array(this.state.length);
  readonly #free = new Uint16Array(MAX_PARTICLES);
  readonly #lastGrid = new Float32Array(STEX_W * STEX_H * 4);
  readonly #sample = new Float32Array(3);
  #pending = new Float32Array(MAX_PARTICLES * 4);
  #next = new Float32Array(MAX_PARTICLES * 4);
  #pendingCount = 0;
  #nextCount = 0;
  #freeCount = MAX_PARTICLES;
  #randomIndex = 0;
  #elapsedMs = -1;
  #accumulator = 0;
  #tick = 0;
  #trailX = 0;
  #trailY = 0;
  #trailRemaining = 0;

  constructor() {
    this.#reset();
  }

  get blend(): number {
    return this.#accumulator;
  }

  get count(): number {
    return MAX_PARTICLES - this.#freeCount;
  }

  #reset(): void {
    this.state.fill(0);
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.state[i * STATE_FLOATS + 3] = DEAD_AGE;
      this.state[i * STATE_FLOATS + 11] = 1;
      this.#free[i] = MAX_PARTICLES - i - 1;
    }
    this.previous.set(this.state);
    this.#freeCount = MAX_PARTICLES;
    this.#randomIndex = 0;
    this.#pendingCount = 0;
    this.#nextCount = 0;
    this.#trailRemaining = 0;
    this.#accumulator = 0;
    this.#tick = 0;
  }

  #signedRandom(): number {
    this.#randomIndex = (this.#randomIndex + 1) >>> 0;
    const n = this.#randomIndex ^ (this.#randomIndex << HASH_SHIFT);
    const hash =
      (Math.imul(n, Math.imul(Math.imul(n, n), HASH_CUBIC) + HASH_LINEAR) +
        HASH_OFFSET) &
      0x7fffffff;
    return Math.fround(1 - Math.fround(hash) / HASH_SCALE);
  }

  #random(): number {
    return Math.fround((this.#signedRandom() + 1) * 0.5);
  }

  #read(grid: Float32Array, cell: number, mix: number, focal: number): void {
    const o = cell * 4;
    const x = (this.#lastGrid[o] ?? 0) * (1 - mix) + (grid[o] ?? 0) * mix;
    const y = (this.#lastGrid[o + 1] ?? 0) * (1 - mix) + (grid[o + 1] ?? 0) * mix;
    const w = (this.#lastGrid[o + 3] ?? 0) * (1 - mix) + (grid[o + 3] ?? 0) * mix;
    this.#sample[0] = (x * ASPECT) / focal;
    this.#sample[1] = y / focal;
    this.#sample[2] = -w;
  }

  #queue(grid: Float32Array, cell: number, mix: number, focal: number): void {
    if (this.#nextCount === MAX_PARTICLES) return;
    this.#read(grid, cell, mix, focal);
    const o = this.#nextCount * 4;
    this.#next[o] = cell;
    this.#next[o + 1] = this.#sample[0] ?? 0;
    this.#next[o + 2] = this.#sample[1] ?? 0;
    this.#next[o + 3] = this.#sample[2] ?? 0;
    this.#nextCount += 1;
  }

  #emit(p: Part, grid: Float32Array, mix: number, focal: number): void {
    this.#nextCount = 0;
    if (this.#random() < p.emitProb) {
      const count = Math.min(MAX_PARTICLES, Math.floor(p.emitPerFrame));
      for (let i = 0; i < count; i += 1) {
        const x = Math.floor(this.#random() * (STEX_W - 1));
        const y = Math.floor(this.#random() * (STEX_H - 1));
        this.#queue(grid, y * STEX_W + x, mix, focal);
      }
    }
    if (this.#trailRemaining === 0) {
      if (this.#random() < TRAIL_PROBABILITY) {
        this.#trailX = Math.floor(this.#random() * (STEX_W - 1));
        this.#trailY = Math.floor(this.#random() * (STEX_H - 1));
        this.#trailRemaining =
          TRAIL_LENGTH + Math.trunc(this.#signedRandom() * TRAIL_VARIANCE);
      }
    } else if (this.#tick % 2 === 0) {
      if (this.#trailX < STEX_W) {
        this.#queue(grid, this.#trailY * STEX_W + this.#trailX, mix, focal);
        this.#trailX += 1;
        this.#trailRemaining -= 1;
      } else {
        this.#trailRemaining = 0;
      }
    }
    const dt = Math.max(p.deltaTime, Number.EPSILON);
    for (let i = 0; i < this.#pendingCount; i += 1) {
      const o = i * 4;
      this.#read(grid, this.#pending[o] ?? 0, mix, focal);
      let ax = ((this.#sample[0] ?? 0) - (this.#pending[o + 1] ?? 0)) / dt;
      let ay = ((this.#sample[1] ?? 0) - (this.#pending[o + 2] ?? 0)) / dt;
      let az = ((this.#sample[2] ?? 0) - (this.#pending[o + 3] ?? 0)) / dt;
      const motion = Math.hypot(ax, ay, az);
      if (motion < MIN_MOTION || this.#freeCount === 0) continue;
      const sign = this.#random() < p.emitNegProb ? -1 : 1;
      ax *= sign / motion;
      ay *= sign / motion;
      az *= sign / motion;
      const xx = ax * ax;
      const yy = ay * ay;
      const zz = az * az;
      let tx = 0;
      let ty = az;
      let tz = -ay;
      if (yy < xx && yy <= zz) {
        tx = -az;
        ty = 0;
        tz = ax;
      } else if (zz < xx && zz < yy) {
        tx = ay;
        ty = -ax;
        tz = 0;
      }
      const tl = Math.hypot(tx, ty, tz);
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const bx = ay * tz - az * ty;
      const by = az * tx - ax * tz;
      const bz = ax * ty - ay * tx;
      const theta = (this.#random() * p.emitConeAngle * Math.PI) / 180;
      const phi = this.#random() * TWO_PI;
      const st = Math.sin(theta);
      const ct = Math.cos(theta);
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const speed = Math.max(
        p.emitVelMin,
        Math.sqrt(
          Math.max(
            0,
            motion * p.emitVelMul * (1 + this.#signedRandom() * p.emitVelVar),
          ),
        ),
      );
      this.#freeCount -= 1;
      const slot = (this.#free[this.#freeCount] ?? 0) * STATE_FLOATS;
      this.state[slot] = this.#sample[0] ?? 0;
      this.state[slot + 1] = this.#sample[1] ?? 0;
      this.state[slot + 2] = this.#sample[2] ?? 0;
      this.state[slot + 3] = 0;
      this.state[slot + 4] = (tx * st * cp + bx * st * sp + ax * ct) * speed;
      this.state[slot + 5] = (ty * st * cp + by * st * sp + ay * ct) * speed;
      this.state[slot + 6] =
        (tz * st * cp + bz * st * sp + az * ct) * p.emitVelZscale * speed;
      this.state[slot + 7] = Math.max(
        MIN_AGE_RATE,
        p.agingSpeed * (1 + this.#signedRandom() * p.agingVariance),
      );
      for (let k = 0; k < STATE_FLOATS; k += 1) {
        this.previous[slot + k] = this.state[slot + k] ?? 0;
      }
    }
    const old = this.#pending;
    this.#pending = this.#next;
    this.#next = old;
    this.#pendingCount = this.#nextCount;
  }

  #update(p: Part): void {
    let rx = BROWNIAN_X;
    let ry = BROWNIAN_Y;
    let rz = BROWNIAN_Z;
    const dt = p.deltaTime;
    const windLength = Math.hypot(p.windDirX, p.windDirY, p.windDirZ);
    const windScale = windLength < MIN_MOTION ? 0 : p.windScale / windLength;
    const spinStep = (0.5 * p.spinTimeScale) / FIXED_HZ;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const o = i * STATE_FLOATS;
      if ((this.state[o + 3] ?? DEAD_AGE) < 0) continue;
      rx = Math.imul(rx, BROWNIAN_MULTIPLIER) >>> 0;
      ry = Math.imul(ry, BROWNIAN_MULTIPLIER) >>> 0;
      rz = Math.imul(rz, BROWNIAN_MULTIPLIER) >>> 0;
      const fx = p.windDirX * windScale + ((rx >>> 9) / 0x400000 - 1) * p.brownianScale;
      const fy =
        p.gravity +
        p.windDirY * windScale +
        ((ry >>> 9) / 0x400000 - 1) * p.brownianScale;
      const fz = p.windDirZ * windScale + ((rz >>> 9) / 0x400000 - 1) * p.brownianScale;
      const vx = this.state[o + 4] ?? 0;
      const vy = this.state[o + 5] ?? 0;
      const vz = this.state[o + 6] ?? 0;
      this.state[o + 4] = vx + (fx - p.friction * vx) * dt;
      this.state[o + 5] = vy + (fy - p.friction * vy) * dt;
      this.state[o + 6] = vz + (fz - p.friction * vz) * dt;
      this.state[o] = (this.state[o] ?? 0) + (this.state[o + 4] ?? 0) * dt;
      this.state[o + 1] = (this.state[o + 1] ?? 0) + (this.state[o + 5] ?? 0) * dt;
      this.state[o + 2] = (this.state[o + 2] ?? 0) + (this.state[o + 6] ?? 0) * dt;
      const age = (this.state[o + 3] ?? 0) + (this.state[o + 7] ?? 0);
      this.state[o + 3] = age;
      if (
        age >= RETIRE_AGE ||
        Math.abs(this.state[o] ?? 0) > LIFE_BOUND ||
        Math.abs(this.state[o + 1] ?? 0) > LIFE_BOUND ||
        Math.abs(this.state[o + 2] ?? 0) > LIFE_BOUND
      ) {
        this.state[o + 3] = DEAD_AGE;
        this.#free[this.#freeCount] = i;
        this.#freeCount += 1;
        continue;
      }
      const phase = age * TWO_PI;
      const wx = Math.sin(phase * SPIN_X);
      const wy = Math.cos(phase * SPIN_Y);
      const wz = Math.cos(phase * SPIN_Z);
      const qx = this.state[o + 8] ?? 0;
      const qy = this.state[o + 9] ?? 0;
      const qz = this.state[o + 10] ?? 0;
      const qw = this.state[o + 11] ?? 1;
      const x = qx + spinStep * (wx * qw + wy * qz - wz * qy);
      const y = qy + spinStep * (-wx * qz + wy * qw + wz * qx);
      const z = qz + spinStep * (wx * qy - wy * qx + wz * qw);
      const w = qw - spinStep * (wx * qx + wy * qy + wz * qz);
      const length = Math.hypot(x, y, z, w);
      this.state[o + 8] = x / length;
      this.state[o + 9] = y / length;
      this.state[o + 10] = z / length;
      this.state[o + 11] = w / length;
    }
  }

  advance(frame: QglFrame): void {
    const time = Math.max(0, frame.elapsedMs);
    const grid = frame.scene.spline;
    const focal = 1 / Math.tan((frame.scene.bg.fovy * Math.PI) / 360);
    if (this.#elapsedMs < 0 || time < this.#elapsedMs) {
      this.#reset();
      this.#lastGrid.set(grid);
      this.#elapsedMs = time;
      this.#emit(frame.scene.part, grid, 1, focal);
      return;
    }
    const span = time - this.#elapsedMs;
    if (span === 0) return;
    const delta = Math.min(MAX_FRAME_GAP, span);
    const oldAccumulator = this.#accumulator;
    this.#accumulator += (delta * FIXED_HZ) / 1000;
    let steps = 0;
    while (this.#accumulator >= 1 - 1e-9) {
      this.previous.set(this.state);
      this.#tick += 1;
      steps += 1;
      const stepTime = ((steps - oldAccumulator) * 1000) / FIXED_HZ;
      const mix = Math.max(0, Math.min(1, stepTime / delta));
      this.#emit(frame.scene.part, grid, mix, focal);
      this.#update(frame.scene.part);
      this.#accumulator = Math.max(0, this.#accumulator - 1);
    }
    this.#lastGrid.set(grid);
    this.#elapsedMs = time;
  }
}
