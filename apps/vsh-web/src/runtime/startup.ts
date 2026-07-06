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