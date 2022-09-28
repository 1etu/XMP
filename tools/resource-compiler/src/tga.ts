const HDR_LEN = 18;
const ID_OFF = 0x00;
const CMAP_OFF = 0x01;
const TYPE_OFF = 0x02;
const WID_OFF = 0x0c;
const HGT_OFF = 0x0e;
const BPP_OFF = 0x10;
const DESC_OFF = 0x11;

const TYPE_RGB = 2;
const TOP_DOWN = 0x20;

export interface Image {
  readonly wid: number;
  readonly hgt: number;
  readonly bpp: number;
  readonly rgba: Uint8Array;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "TgaFormatError";
    this.detail = detail;
  }
}

export function decode(buf: Buffer): Image {
  const type = buf[TYPE_OFF] ?? 0;
  if (type !== TYPE_RGB) {
    throw new FormatError(`want type ${String(TYPE_RGB)}, got ${String(type)}`);
  }
  if ((buf[CMAP_OFF] ?? 0) !== 0) {
    throw new FormatError("colour-mapped tga");
  }

  const wid = buf.readUInt16LE(WID_OFF);
  const hgt = buf.readUInt16LE(HGT_OFF);
  const bpp = buf[BPP_OFF] ?? 0;
  const desc = buf[DESC_OFF] ?? 0;

  if (bpp !== 24 && bpp !== 32) {
    throw new FormatError(`want 24 or 32 bpp, got ${String(bpp)}`);
  }

  const step = bpp / 8;
  const base = HDR_LEN + (buf[ID_OFF] ?? 0);
  const rgba = new Uint8Array(wid * hgt * 4);

  for (let y = 0; y < hgt; y += 1) {
    const row = (desc & TOP_DOWN) !== 0 ? y : hgt - 1 - y;

    for (let x = 0; x < wid; x += 1) {
      const s = base + (y * wid + x) * step;
      const d = (row * wid + x) * 4;

      rgba[d] = buf[s + 2] ?? 0;
      rgba[d + 1] = buf[s + 1] ?? 0;
      rgba[d + 2] = buf[s] ?? 0;
      rgba[d + 3] = step === 4 ? (buf[s + 3] ?? 0xff) : 0xff;
    }
  }

  return { wid, hgt, bpp, rgba };
}
