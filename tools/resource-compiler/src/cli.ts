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

const WANT_SOUND: Readonly<Record<string, string>> = {
  snd_cursor: "SE02_Cursor",
  snd_decide: "SE03_Normal_OK",
  snd_cancel: "SE04_Back",
  snd_category_decide: "SE05_Category_OK",
  snd_option: "SE08_Option",
  snd_error: "SE09_Error",
  snd_system_ok: "SE12_System_OK",
  snd_system_ng: "SE13_System_NG",
};

const LUT_PFX = "textures/TGA/";

function stable(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v.map(stable);
  }
  if (v !== null && typeof v === "object") {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) {
      out[k] = stable(src[k]);
    }
    return out;
  }
  return v;
}

function emit(path: string, body: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(stable(body), null, 2)}\n`, "utf8");
}

function blob(path: string, body: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

function data(name: string): unknown {
  return JSON.parse(readFileSync(join(DATA, name), "utf8"));
}
