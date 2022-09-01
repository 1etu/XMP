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

function fileTbl(arc: Buffer): File[] {
  const tbl = arc.readUInt32BE(TBL_OFF);
  const end = tbl + arc.readUInt32BE(TBL_SIZE);
  const tags = arc.subarray(arc.readUInt32BE(TAG_OFF));
  const strs = arc.readUInt32BE(STR_TBL_OFF);

  const out: File[] = [];
  let p = tbl;

  while (p + NODE_HDR <= end) {
    const tag = cstr(tags, arc.readUInt32BE(p));
    const nAttr = arc.readUInt32BE(p + 4);
    const attrs = p + NODE_HDR;

    if (tag === TAG_FILE) {
      let name = "";
      let off = -1;
      let len = -1;
      let rawLen = -1;

      for (let i = 0; i < nAttr; i += 1) {
        const a = attrs + i * ATTR_LEN;
        const v0 = arc.readUInt32BE(a + 8);
        const v1 = arc.readUInt32BE(a + 12);

        switch (cstr(tags, arc.readUInt32BE(a))) {
          case TAG_SRC:
            off = v0;
            len = v1;
            break;
          case TAG_ID:
            name = cstr(arc, strs + v0 + LINK_LEN);
            break;
          case TAG_SIZE_ATTR:
            rawLen = v0;
            break;
          default:
            break;
        }
      }

      if (off < 0 || len < 0) {
        throw new FormatError(`file node lacks ${TAG_SRC}`, p);
      }

      out.push({ name, off, len, rawLen: rawLen < 0 ? len : rawLen });
    }

    p = attrs + nAttr * ATTR_LEN;
  }

  return out;
}

export function parse(arc: Buffer): Archive {
  const magic = magic4(arc, 0);
  if (magic !== ARC_MAGIC) {
    throw new FormatError(`want ${ARC_MAGIC}, got ${magic}`, 0);
  }

  const datOff = arc.readUInt32BE(DAT_OFF);
  const datSize = arc.readUInt32BE(DAT_SIZE);

  if (datOff + datSize !== arc.byteLength) {
    throw new FormatError(
      `dat ${String(datOff)}+${String(datSize)} misses eof ${String(arc.byteLength)}`,
    );
  }

  return {
    names: strTbl(arc, arc.readUInt32BE(STR_TBL_OFF), arc.readUInt32BE(STR_TBL_SIZE)),
    raw: arc,
    dat: arc.subarray(datOff, datOff + datSize),
    files: fileTbl(arc),
  };
}
