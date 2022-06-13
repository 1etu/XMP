import * as Dds from "./dds.ts";
import * as Qrc from "./qrc.ts";

const ATLAS_PX = 128;
const ENV_PX = 64;
const ENV_NAME = "dif";

export interface Tex {
  readonly name: string;
  readonly img: Dds.Image;
}

export class SetError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "IcontexSetError";
    this.detail = detail;
  }
}

function flip(img: Dds.Image): Dds.Image {
  const stride = img.wid * 4;
  const rgba = new Uint8Array(img.rgba.byteLength);

  for (let y = 0; y < img.hgt; y += 1) {
    rgba.set(img.rgba.subarray(y * stride, (y + 1) * stride), (img.hgt - 1 - y) * stride);
  }

  return { wid: img.wid, hgt: img.hgt, rgba };
}
