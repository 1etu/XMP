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
