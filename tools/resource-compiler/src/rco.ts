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
