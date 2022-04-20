import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as Icons from "./iconset.ts";
import * as Icontex from "./icontex.ts";
import * as Palette from "./palette.ts";
import * as Png from "./png.ts";
import * as Preset from "./preset.ts";
import * as Qrc from "./qrc.ts";
import * as Rco from "./rco.ts";
import * as Tga from "./tga.ts";
import * as Tree from "./tree.ts";
import * as Vag from "./vag.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");