const MAGIC = "VAGp";
const HDR_LEN = 0x30;
const LEN_OFF = 0x0c;
const RATE_OFF = 0x10;
const NAME_OFF = 0x20;
const NAME_LEN = 0x10;

const FRAME_LEN = 16;
const FRAME_PCM = 28;
const FLAG_END = 0x07;

const COEF: readonly (readonly [number, number])[] = [
  [0, 0],
  [60, 0],
  [115, -52],
  [98, -55],
  [122, -60],
];
const COEF_SHIFT = 6;
const NIB_SHIFT = 12;
const PCM_MIN = -0x8000;
const PCM_MAX = 0x7fff;
