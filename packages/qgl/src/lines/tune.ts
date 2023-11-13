import { design, measured, verified } from "@vsh/resource";

export const STEX_W = measured(128);
export const STEX_H = measured(128);
export const CONTROL_SIZE = measured(19);

export const COMPONENTS = 4;
export const BASIS_SIZE = 4;
export const SPANS = CONTROL_SIZE - 3;
export const FIXED_HZ = verified(60);
export const TIME_SCALE = verified(0.0001);
export const FFD_TIME_SCALE = verified(10);
export const MAX_FRAME_GAP = design(1000);
export const FOVY = measured(71.846);
export const ASPECT = measured(16 / 9);
export const NEAR = measured(0.1);
export const FAR = measured(1000);