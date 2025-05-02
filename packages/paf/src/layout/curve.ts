export const OFFSCREEN = 1.6;

export function spread(d: number, gap: number, pitch: number, gapUp = gap): number {
  const a = Math.abs(d);
  const sign = d < 0 ? -1 : 1;
  const g = d < 0 ? gapUp : gap;

  return a <= 1 ? d * g : sign * (g + (a - 1) * pitch);
}
