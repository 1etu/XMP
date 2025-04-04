export enum AccelMode {
  Linear = 0x0,
  Decelerate = 0x1,
  Accelerate = 0x4,
  Approach = 0x5,
}

export const EPS = 1e-6;

export function ease(t: number, mode: AccelMode): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;

  switch (mode) {
    case AccelMode.Decelerate:
      return 1 - (1 - k) * (1 - k);
    case AccelMode.Accelerate:
      return k * k;
    default:
      return k;
  }
}
