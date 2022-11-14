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

const WAV_HDR = 44;
const WAV_PCM = 1;
const WAV_BITS = 16;

export interface Clip {
  readonly name: string;
  readonly rate: number;
  readonly pcm: Int16Array;
}

export class FormatError extends Error {
  readonly detail: string;
  readonly off: number;

  constructor(detail: string, off: number) {
    super(`${detail} at ${String(off)}`);
    this.name = "VagFormatError";
    this.detail = detail;
    this.off = off;
  }
}

function clamp(v: number): number {
  return v < PCM_MIN ? PCM_MIN : v > PCM_MAX ? PCM_MAX : v;
}

export function decode(buf: Buffer, off: number): Clip {
  if (buf.subarray(off, off + 4).toString("latin1") !== MAGIC) {
    throw new FormatError(`want ${MAGIC}`, off);
  }

  const len = buf.readUInt32BE(off + LEN_OFF);
  const rate = buf.readUInt32BE(off + RATE_OFF);
  const name = buf
    .subarray(off + NAME_OFF, off + NAME_OFF + NAME_LEN)
    .toString("latin1")
    .replace(/\0.*$/, "");

  const nFrame = Math.floor(len / FRAME_LEN);
  const pcm = new Int16Array(nFrame * FRAME_PCM);

  let h1 = 0;
  let h2 = 0;
  let w = 0;

  for (let f = 0; f < nFrame; f += 1) {
    const p = off + HDR_LEN + f * FRAME_LEN;
    const head = buf[p] ?? 0;
    const shift = head & 0x0f;
    const pred = (head >> 4) & 0x0f;

    if ((buf[p + 1] ?? 0) === FLAG_END) {
      break;
    }

    const [c0, c1] = COEF[pred] ?? COEF[0] ?? [0, 0];

    for (let i = 0; i < FRAME_PCM; i += 1) {
      const byte = buf[p + 2 + (i >> 1)] ?? 0;
      const nib = (i & 1) === 0 ? byte & 0x0f : byte >> 4;
      const s = ((nib << NIB_SHIFT) << 16) >> 16;

      const v = clamp((s >> shift) + ((c0 * h1 + c1 * h2) >> COEF_SHIFT));
      pcm[w] = v;
      w += 1;
      h2 = h1;
      h1 = v;
    }
  }

  return { name, rate, pcm: pcm.subarray(0, w) };
}

export function scan(buf: Buffer, from: number, to: number): Clip[] {
  const tag = Buffer.from(MAGIC, "latin1");
  const out: Clip[] = [];

  for (let p = buf.indexOf(tag, from); p >= 0 && p < to; p = buf.indexOf(tag, p + 4)) {
    out.push(decode(buf, p));
  }

  return out;
}
