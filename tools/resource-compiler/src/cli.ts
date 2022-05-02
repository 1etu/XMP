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
const DATA = join(ROOT, "tools", "resource-compiler", "data");
const OUT = join(ROOT, "resources");
const LOCAL = join(ROOT, "assets", "original");

const FW = join(ROOT, "research/fw493/dev_flash/vsh/resource");
const QGL = join(FW, "qgl");
const XMB = join(FW, "explore/xmb");
const FONT = join(ROOT, "research/fw493/dev_flash/data/font");

const WANT_FONT = [
  "SCE-PS3-RD-R-LATIN.TTF",
  "SCE-PS3-RD-L-LATIN.TTF",
  "SCE-PS3-RD-B-LATIN.TTF",
  "SCE-PS3-NR-R-JPN.TTF",
];

const WANT_WAVE = [
  "base",
  "coldboot1",
  "coldboot2",
  "welcome_1",
  "welcome_2",
  "day",
  "night",
  "yoake",
  "higure",
];
