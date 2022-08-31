import { inflateSync } from "node:zlib";

const CNT_MAGIC = "QRCC";
const ARC_MAGIC = "QRCF";
const CNT_HDR_SIZE = 8;

const TBL_OFF = 0x08;
const TBL_SIZE = 0x0c;
const STR_TBL_OFF = 0x10;
const STR_TBL_SIZE = 0x14;
const TAG_OFF = 0x18;
const DAT_OFF = 0x20;
const DAT_SIZE = 0x34;

const NODE_HDR = 28;
const ATTR_LEN = 16;
const LINK_LEN = 4;
const TAG_FILE = "file";
const TAG_SRC = "src";
const TAG_ID = "id";
const TAG_SIZE_ATTR = "size";

export interface Archive {
  readonly names: readonly string[];
  readonly raw: Buffer;
  readonly dat: Buffer;
  readonly files: readonly File[];
}

export interface File {
  readonly name: string;
  readonly off: number;
  readonly len: number;
  readonly rawLen: number;
}

export class FormatError extends Error {
  readonly detail: string;
  readonly off: number | undefined;

  constructor(detail: string, off?: number) {
    super(off === undefined ? detail : `${detail} at ${String(off)}`);
    this.name = "QrcFormatError";
    this.detail = detail;
    this.off = off;
  }
}

function magic4(buf: Buffer, off: number): string {
  return buf.subarray(off, off + 4).toString("latin1");
}

export function inflate(buf: Buffer): Buffer {
  const magic = magic4(buf, 0);
  if (magic !== CNT_MAGIC) {
    throw new FormatError(`want ${CNT_MAGIC}, got ${magic}`, 0);
  }

  const want = buf.readUInt32BE(4);
  const raw = inflateSync(buf.subarray(CNT_HDR_SIZE));

  if (raw.byteLength !== want) {
    throw new FormatError(
      `inflated ${String(raw.byteLength)}, header says ${String(want)}`,
    );
  }

  return raw;
}

function strTbl(arc: Buffer, off: number, size: number): string[] {
  const names: string[] = [];
  const end = off + size;
  let p = off;

  while (p + 4 < end) {
    p += 4;
    const nul = arc.indexOf(0, p);
    if (nul < 0 || nul >= end) {
      break;
    }
    const s = arc.subarray(p, nul).toString("latin1");
    if (s.length > 0) {
      names.push(s);
    }
    p = nul + 1;
  }

  return names;
}

function cstr(buf: Buffer, off: number): string {
  const nul = buf.indexOf(0, off);
  return buf.subarray(off, nul < 0 ? buf.byteLength : nul).toString("latin1");
}
