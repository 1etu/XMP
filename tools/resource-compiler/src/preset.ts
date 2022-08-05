import * as Mnu from "./mnu.ts";
import * as Qrc from "./qrc.ts";

const N_CORNER = 4;
const BASE_ID = "base";
const CHAN = ["RED", "GREEN", "BLUE"] as const;

const SIG: Readonly<Record<string, string>> = {
  BACKGROUND: "1 RED",
  HDR: "ENABLED",
  LINE1: "STATE",
  PARTICLES: "emit vel min",
  PARTICLES_SPE: "delta time",
  PARTICLES_UI: "brownian",
};
