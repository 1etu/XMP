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
