import { design, measured, verified } from "@vsh/qgl";

const WIDTH = verified(700);
const HEIGHT = verified(350);
const WORLD_WIDTH = verified(2.56);
const WORLD_HEIGHT = verified(1.28);
const MATERIAL_GAIN = measured(0.262);
const LIGHT_START_X = verified(-3);
const LIGHT_START_Y = verified(0.5);
const LIGHT_EXIT_X = verified(2.25);
const LIGHT_EXIT_Y = verified(1.5);
const ATTENUATION_START = [verified(0), verified(1), verified(4)] as const;
const ATTENUATION_LIT = verified(0.1);
const FOOTER_START = measured(222);
const BLACK_LEVEL = design(8);
const BLUR_RADIUS = design(3);
