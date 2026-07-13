import { measured, verified } from "@vsh/qgl";

const LOGO_START = measured(2208);
const LOGO_LIGHT = verified(1300);
const BLUR_START = measured(3258);
const BLUR_END = measured(4008);
const FOOTER_START = measured(4008);
const LOGO_END = measured(5008);
const LOGO_FADE = verified(1200);
export const MENU_START = measured(8200);
export const STARTUP_END = measured(11500);
export const STARTUP_WAVE_DELAY = measured(1500);

const MENU_ALPHA = [
  [measured(8380), measured(0)],
  [measured(8400), measured(0.1347)],
  [measured(8500), measured(0.5363)],
  [measured(8600), measured(0.7753)],
  [measured(8700), measured(0.9011)],
  [measured(8800), measured(0.961)],
  [measured(8900), measured(1)],
] as const;
const MENU_SCALE = [
  [measured(8380), measured(1.088)],
  [measured(8400), measured(1.0751)],
  [measured(8500), measured(1.0401)],
  [measured(8600), measured(1.0211)],
  [measured(8700), measured(1.0109)],
  [measured(8800), measured(1.0055)],
  [measured(9000), measured(1.0013)],
  [measured(9400), measured(1)],
] as const;
const MENU_BLUR = [
  [measured(8380), measured(5.55)],
  [measured(8400), measured(3.6292)],
  [measured(8500), measured(1.0086)],
  [measured(8600), measured(0.6736)],
  [measured(8700), measured(0.1122)],
  [measured(8800), measured(0.0902)],
  [measured(9000), measured(0)],
] as const;
const WAVE_GAIN = [
  [measured(0), measured(0.9)],
  [measured(1500), measured(0.8)],
  [measured(2500), measured(1.25)],
  [measured(4000), measured(1.2)],
  [measured(6000), measured(0.9)],
  [measured(8500), measured(0.5)],
  [measured(9000), measured(0.5)],
  [measured(11500), measured(1.6)],
] as const;

export interface StartupFrame {
  readonly elapsedMs: number;
  readonly logo: number;
  readonly blur: number;
  readonly footer: number;
  readonly light: number;
  readonly fade: number;
  readonly menu: number;
  readonly clock: number;
  readonly menuScale: number;
  readonly menuBlur: number;
  readonly waveGain: number;
  readonly appearance: number;
  readonly done: boolean;
}

function ramp(time: number, start: number, duration: number): number {
  return Math.min(1, Math.max(0, (time - start) / duration));
}

function sample(time: number, points: readonly (readonly [number, number])[]): number {
  const index = points.findIndex(([at]) => at >= time);
  if (index < 0) return points.at(-1)?.[1] ?? 0;
  const b = points[index];
  if (b === undefined) return 0;
  if (index === 0) return b[1];
  const a = points[index - 1] ?? b;
  const before = points[index - 2] ?? a;
  const after = points[index + 1] ?? b;
  const duration = b[0] - a[0];
  const slope = (b[1] - a[1]) / duration;
  const tangent = (other: number): number =>
    slope * other <= 0 ? 0 : (2 * slope * other) / (slope + other);
  const m0 = tangent((a[1] - before[1]) / Math.max(1, a[0] - before[0])) * duration;
  const m1 = tangent((after[1] - b[1]) / Math.max(1, after[0] - b[0])) * duration;
  const k = (time - a[0]) / duration;
  const k2 = k * k;
  const k3 = k2 * k;
  return (
    (2 * k3 - 3 * k2 + 1) * a[1] +
    (k3 - 2 * k2 + k) * m0 +
    (-2 * k3 + 3 * k2) * b[1] +
    (k3 - k2) * m1
  );
}

function curve(t: number, x1: number, x2: number): number {
  if (t <= 0 || t >= 1) return t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const u = (lo + hi) * 0.5;
    const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    if (x < t) lo = u;
    else hi = u;
  }
  const u = (lo + hi) * 0.5;
  return u * u * (3 - 2 * u);
}

export function startupAt(elapsedMs: number, reduced: boolean): StartupFrame {
  const t = reduced ? STARTUP_END : elapsedMs;
  const fade = curve(ramp(t, LOGO_END, LOGO_FADE), verified(0.8), verified(0.8));
  return {
    elapsedMs: t,
    logo: ramp(t, LOGO_START, 100) * (1 - fade),
    blur:
      curve(ramp(t, BLUR_START, 500), 0.1, 0.1) *
      (1 - curve(ramp(t, BLUR_END, 500), 0.1, 0.1)) *
      (1 - fade),
    footer: curve(ramp(t, FOOTER_START, 500), 0.1, 0.1) * (1 - fade),
    light: ramp(t, LOGO_START, LOGO_LIGHT),
    fade,
    menu: sample(t, MENU_ALPHA),
    clock: curve(ramp(t, MENU_START, 150), 0.1, 0.1),
    menuScale: sample(t, MENU_SCALE),
    menuBlur: sample(t, MENU_BLUR),
    waveGain: sample(t, WAVE_GAIN),
    appearance: curve(ramp(t, measured(9000), measured(2500)), 0.25, 0.75),
    done: t >= STARTUP_END,
  };
}
