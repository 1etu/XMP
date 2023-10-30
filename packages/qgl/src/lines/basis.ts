export function basis(t: number, out: Float32Array, offset = 0): void {
  const t2 = t * t;
  const t3 = t2 * t;
  out[offset] = (1 - 3 * t + 3 * t2 - t3) / 6;
  out[offset + 1] = (4 - 6 * t2 + 3 * t3) / 6;
  out[offset + 2] = (1 + 3 * t + 3 * t2 - 3 * t3) / 6;
  out[offset + 3] = t3 / 6;
}

export function derivative(t: number, out: Float32Array, offset = 0): void {
  const t2 = t * t;
  out[offset] = (-(1 - t) * (1 - t)) / 2;
  out[offset + 1] = 1.5 * t2 - 2 * t;
  out[offset + 2] = 0.5 + t - 1.5 * t2;
  out[offset + 3] = t2 / 2;
}
