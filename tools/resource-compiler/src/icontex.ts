import * as Dds from "./dds.ts";
import * as Qrc from "./qrc.ts";

const ATLAS_PX = 128;
const ENV_PX = 64;
const ENV_NAME = "dif";

export interface Tex {
  readonly name: string;
  readonly img: Dds.Image;
}
