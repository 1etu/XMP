import { deflateSync, inflateSync } from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BIT_DEPTH = 8;
const COLOR_RGBA = 6;
const CHAN = 4;
const FILTER_NONE = 0;
const CRC_POLY = 0xedb88320;

const TBL = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? CRC_POLY ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) {
    c = (TBL[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tag: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.byteLength, 0);
  head.write(tag, 4, "latin1");

  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);

  return Buffer.concat([head, body, tail]);
}

export function encode(wid: number, hgt: number, rgba: Uint8Array): Buffer {
  const stride = wid * CHAN;
  const rows = Buffer.alloc(hgt * (stride + 1));

  for (let y = 0; y < hgt; y += 1) {
    rows[y * (stride + 1)] = FILTER_NONE;
    rows.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(wid, 0);
  ihdr.writeUInt32BE(hgt, 4);
  ihdr[8] = BIT_DEPTH;
  ihdr[9] = COLOR_RGBA;

  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const IHDR = "IHDR";
const IDAT = "IDAT";
const IEND = "IEND";
const HDR_OFF = 8;

export interface Image {
  readonly wid: number;
  readonly hgt: number;
  readonly rgba: Uint8Array;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PngFormatError";
    this.detail = detail;
  }
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(rows: Buffer, wid: number, hgt: number, bpp: number): Uint8Array {
  const stride = wid * bpp;
  const out = new Uint8Array(stride * hgt);

  for (let y = 0; y < hgt; y += 1) {
    const type = rows[y * (stride + 1)] ?? 0;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = rows[src + x] ?? 0;
      const a = x >= bpp ? (out[dst + x - bpp] ?? 0) : 0;
      const b = y > 0 ? (out[up + x] ?? 0) : 0;
      const c = y > 0 && x >= bpp ? (out[up + x - bpp] ?? 0) : 0;

      let v = raw;
      if (type === 1) {
        v = raw + a;
      } else if (type === 2) {
        v = raw + b;
      } else if (type === 3) {
        v = raw + ((a + b) >> 1);
      } else if (type === 4) {
        v = raw + paeth(a, b, c);
      }

      out[dst + x] = v & 0xff;
    }
  }

  return out;
}

export function decode(buf: Buffer): Image {
  let p = HDR_OFF;
  let wid = 0;
  let hgt = 0;
  let bpp = 0;
  const parts: Buffer[] = [];

  while (p + 8 <= buf.byteLength) {
    const len = buf.readUInt32BE(p);
    const tag = buf.subarray(p + 4, p + 8).toString("latin1");
    const body = buf.subarray(p + 8, p + 8 + len);

    if (tag === IHDR) {
      wid = body.readUInt32BE(0);
      hgt = body.readUInt32BE(4);
      const depth = body[8] ?? 0;
      const color = body[9] ?? 0;

      if (depth !== BIT_DEPTH) {
        throw new FormatError(`want 8-bit, got ${String(depth)}`);
      }
      if (color !== COLOR_RGBA && color !== 2) {
        throw new FormatError(`want rgb or rgba, got colour type ${String(color)}`);
      }
      bpp = color === COLOR_RGBA ? 4 : 3;
    } else if (tag === IDAT) {
      parts.push(body);
    } else if (tag === IEND) {
      break;
    }

    p += 12 + len;
  }

  const flat = unfilter(inflateSync(Buffer.concat(parts)), wid, hgt, bpp);

  if (bpp === CHAN) {
    return { wid, hgt, rgba: flat };
  }

  const rgba = new Uint8Array(wid * hgt * CHAN);
  for (let i = 0; i < wid * hgt; i += 1) {
    rgba[i * 4] = flat[i * 3] ?? 0;
    rgba[i * 4 + 1] = flat[i * 3 + 1] ?? 0;
    rgba[i * 4 + 2] = flat[i * 3 + 2] ?? 0;
    rgba[i * 4 + 3] = 0xff;
  }

  return { wid, hgt, rgba };
}
