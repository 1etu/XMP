const MAGIC = "DDS ";
const HDR_SIZE = 128;
const HGT_OFF = 0x0c;
const WID_OFF = 0x10;
const PF_BPP = 0x58;
const PF_RMASK = 0x5c;
const BGRA_RMASK = 0x00ff0000;

export interface Image {
  readonly wid: number;
  readonly hgt: number;
  readonly rgba: Uint8Array;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "DdsFormatError";
    this.detail = detail;
  }
}

export function decode(dat: Buffer, off: number): Image {
  const hgt = dat.readUInt32LE(off + HGT_OFF);
  const wid = dat.readUInt32LE(off + WID_OFF);
  const bpp = dat.readUInt32LE(off + PF_BPP);
  const rmask = dat.readUInt32LE(off + PF_RMASK);

  if (bpp !== 32) {
    throw new FormatError(`want 32 bpp, got ${String(bpp)}`);
  }

  const nPix = wid * hgt;
  const src = dat.subarray(off + HDR_SIZE, off + HDR_SIZE + nPix * 4);

  if (src.byteLength < nPix * 4) {
    throw new FormatError(
      `short surface: ${String(src.byteLength)} of ${String(nPix * 4)}`,
    );
  }

  const swap = rmask === BGRA_RMASK;
  const rgba = new Uint8Array(nPix * 4);

  for (let i = 0; i < nPix; i += 1) {
    const o = i * 4;
    const c0 = src[o] ?? 0;
    const c1 = src[o + 1] ?? 0;
    const c2 = src[o + 2] ?? 0;

    rgba[o] = swap ? c2 : c0;
    rgba[o + 1] = c1;
    rgba[o + 2] = swap ? c0 : c2;
    rgba[o + 3] = src[o + 3] ?? 0xff;
  }

  return { wid, hgt, rgba };
}
