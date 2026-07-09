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
