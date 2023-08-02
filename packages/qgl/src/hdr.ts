export const EXPOSURE_SAMPLES = verified(128);
export const DISPLAY_GAIN = verified(0.8);
export const GAUSSIAN_TAPS = verified(8);
const MAX_GLARE_SIZE = design(9);
const MAX_GLARE_LEVELS = design(9);
const scratch = new Float32Array(1);