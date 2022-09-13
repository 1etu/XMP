const MAGIC = 0x46525000;
const HDR_LEN = 0xa4;
const SND_OFF = 0x88;
const SND_SIZE = 0x8c;
const NONE = 0xffffffff;

export interface Sounds {
  readonly off: number;
  readonly len: number;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "RcoFormatError";
    this.detail = detail;
  }
}

export function sounds(buf: Buffer): Sounds {
  if (buf.byteLength < HDR_LEN) {
    throw new FormatError(`short header: ${String(buf.byteLength)}`);
  }

  const magic = buf.readUInt32BE(0);
  if (magic !== MAGIC) {
    throw new FormatError(`want ${MAGIC.toString(16)}, got ${magic.toString(16)}`);
  }

  const off = buf.readUInt32BE(SND_OFF);
  const len = buf.readUInt32BE(SND_SIZE);

  if (off === NONE || len === NONE) {
    return { off: 0, len: 0 };
  }

  if (off + len > buf.byteLength) {
    throw new FormatError(
      `sound ${String(off)}+${String(len)} past eof ${String(buf.byteLength)}`,
    );
  }

  return { off, len };
}
