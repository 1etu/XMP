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

export function build(arc: Qrc.Archive): Tex[] {
  const out = arc.files.map((file) => ({
    name: file.name,
    img: flip(Dds.decode(Qrc.bytes(arc, file), 0)),
  }));

  const env = out.find((t) => t.name === ENV_NAME);
  if (env === undefined) {
    throw new SetError(`set lacks ${ENV_NAME}`);
  }
  if (env.img.wid !== ENV_PX || env.img.hgt !== ENV_PX) {
    throw new SetError(
      `${ENV_NAME} is ${String(env.img.wid)}x${String(env.img.hgt)}, want ${String(ENV_PX)}`,
    );
  }

  for (const t of out) {
    if (t.name !== ENV_NAME && (t.img.wid !== ATLAS_PX || t.img.hgt !== ATLAS_PX)) {
      throw new SetError(
        `${t.name} is ${String(t.img.wid)}x${String(t.img.hgt)}, want ${String(ATLAS_PX)}`,
      );
    }
  }

  return out;
}

export function slot(name: string): string {
  const n = Number(name.replace(/n$/, ""));
  return Number.isInteger(n) ? String(n).padStart(2, "0") : name;
}
