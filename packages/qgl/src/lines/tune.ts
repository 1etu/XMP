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
export const FFD_MAX = verified(0.9989999532699585);
export const FFD_W = verified(8);
export const FFD_D = verified(4);
export const TIME_RESET = verified(10);
export const FFD_FADE_STEP = verified(0.005);
export const SPRING_SECOND_NEIGHBOR = verified(10);
export const EDGE_SMOOTHING = verified(0.1);
export const EDGE_PUSH = verified(0.02);
export const EDGE_Y_RATE = verified(11);
export const EDGE_Z_RATE = verified(15);
export const HASH_SHIFT = verified(13);
export const HASH_CUBIC = verified(15731);
export const HASH_LINEAR = verified(789221);
export const HASH_OFFSET = verified(1376312589);
export const HASH_SCALE = verified(1073741824);
export const FFD = {
  timeDecay: verified(0.0001),
  centerRate: verified(0.1),
  riseRate: verified(0.25),
  amplitudeRate: verified(2),
  amplitudeBias: verified(3),
  xLinear: verified(0.2),
  xQuadratic: verified(1.3),
  xOffset: verified(0.15),
  envelopeScale: verified(0.24),
  centerScale: verified(0.833333313),
  waveSpan: verified(7.85000038),
  waveRate: verified(2.5),
  waveOffset: verified(1.25),
  gaussian: verified(50),
  twistSpan: verified(6.28000021),
  twistAmplitude: verified(0.125),
  taperLength: verified(5),
};

export interface Lattice {
  readonly width: number;
  readonly height: number;
  readonly points: readonly number[];
  readonly velocities: readonly number[];
  readonly phaseMs?: number;
}
