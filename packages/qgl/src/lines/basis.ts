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

export function evalSpline(cp: Float32Array, u: number, b: Float32Array): number {
  const n = cp.length - 3;
  if (n < 1) return 0;
  const s = Math.min(Math.max(u * n, 0), n - 1e-6);
  const seg = Math.floor(s);
  basis(s - seg, b);
  return (
    (b[0] ?? 0) * (cp[seg] ?? 0) +
    (b[1] ?? 0) * (cp[seg + 1] ?? 0) +
    (b[2] ?? 0) * (cp[seg + 2] ?? 0) +
    (b[3] ?? 0) * (cp[seg + 3] ?? 0)
  );
}
