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

function hashOf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function wave(log: string[]): void {
  const buf = readFileSync(join(QGL, "lines.qrc"));
  const arc = Qrc.read(buf);
  const meta = { classification: "MEASURED", source: "lines.qrc", sourceHash: hashOf(buf) };

  for (const id of WANT_WAVE) {
    const preset = Preset.build(arc).get(id);
    if (preset === undefined) {
      throw new Error(`missing wave preset ${id}`);
    }
    emit(join(OUT, "qgl/presets", `${id}.json`), { ...meta, ...preset });
  }

  const months = Palette.build(arc);
  emit(join(OUT, "qgl/month-palette.json"), { ...meta, months });

  const luts: Record<string, unknown> = {};
  for (const f of arc.files.filter((x) => x.name.startsWith(LUT_PFX))) {
    const img = Tga.decode(arc.dat.subarray(f.off, f.off + f.len));
    if (img.hgt !== 1) {
      continue;
    }
    luts[f.name] = { width: img.wid, bpp: img.bpp, ...Tga.row(img) };
  }
  emit(join(OUT, "qgl/fres-lut.json"), { ...meta, luts });

  log.push(
    `wave: ${String(WANT_WAVE.length)} presets, ${String(months.length)} palettes, ${String(Object.keys(luts).length)} luts`,
  );
}

function icons(log: string[]): void {
  const buf = readFileSync(join(QGL, "icons.qrc"));
  const arc = Qrc.read(buf);
  const meta = { classification: "MEASURED", source: "icons.qrc", sourceHash: hashOf(buf) };
  const sets = Icons.build(arc);

  for (const id of WANT_WAVE) {
    const set = sets.get(id);
    if (set === undefined) {
      continue;
    }
    emit(join(OUT, "qgl/icons", `${id}.json`), { ...meta, ...set });
  }

  log.push(`icons: ${String(sets.size)} sets, ${String(WANT_WAVE.length)} emitted`);
}

function icontex(log: string[]): void {
  const arc = Qrc.read(readFileSync(join(QGL, "icontex.qrc")));
  const tex = Icontex.build(arc);

  for (const t of tex) {
    blob(
      join(LOCAL, "icon", `${Icontex.slot(t.name)}.png`),
      Png.encode(t.img.wid, t.img.hgt, t.img.rgba),
    );
  }

  log.push(`icontex: ${String(tex.length)} textures`);
}

function fonts(log: string[]): void {
  for (const name of WANT_FONT) {
    blob(join(LOCAL, "font", name), readFileSync(join(FONT, name)));
  }

  log.push(`fonts: ${String(WANT_FONT.length)} faces`);
}

function sounds(log: string[]): void {
  const buf = readFileSync(join(FW, "system_plugin.rco"));
  const region = Rco.sounds(buf);
  const clips = new Map<string, Vag.Clip>();

  for (const clip of Vag.scan(buf, region.off, region.off + region.len)) {
    if (!clips.has(clip.name)) {
      clips.set(clip.name, clip);
    }
  }

  const entries: Record<string, unknown> = {};

  for (const [id, name] of Object.entries(WANT_SOUND)) {
    const clip = clips.get(name);
    if (clip === undefined) {
      throw new Error(`rco has no clip ${name}`);
    }
    blob(join(LOCAL, "sound", `${id}.wav`), Vag.wav(clip));
    entries[id] = {
      rate: clip.rate,
      samples: clip.pcm.length,
      durationMs: Math.round((clip.pcm.length / clip.rate) * 1000),
    };
  }

  emit(join(OUT, "audio/manifest.json"), {
    classification: "MEASURED",
    source: "system_plugin.rco",
    sourceHash: hashOf(buf),
    clips: entries,
  });

  log.push(`sounds: ${String(Object.keys(entries).length)} clips`);
}

function xmb(log: string[]): void {
  const spec = data("categories.json") as Tree.Spec;
  const atlasFile = data("atlas.json") as { slots: Record<string, number> };
  const strings = data("strings.json") as { text: Record<string, string> };

  const atlas = new Tree.Atlas(atlasFile.slots);
  const categories = Tree.build(spec, atlas, (xml) =>
    readFileSync(join(XMB, xml), "utf8"),
  );

  const missing = new Set<string>();
  const visit = (items: readonly Tree.Item[]): void => {
    for (const i of items) {
      for (const key of [i.title, i.info]) {
        if (key.length > 0 && strings.text[key] === undefined) {
          missing.add(key);
        }
      }
      visit(i.items);
    }
  };
  for (const c of categories) {
    if (strings.text[c.title] === undefined) {
      missing.add(c.title);
    }
    visit(c.items);
  }

  emit(join(OUT, "xmb/tree.json"), {
    classification: "MEASURED",
    source: "explore/xmb/category_*.xml",
    categories,
  });
  emit(join(OUT, "xmb/strings.json"), strings);
  emit(join(OUT, "xmb/layout.json"), data("layout.json"));

  const nItem = categories.reduce((n, c) => n + c.items.length, 0);
  log.push(
    `xmb: ${String(categories.length)} categories, ${String(nItem)} items, ${String(missing.size)} strings missing`,
  );
  if (missing.size > 0) {
    log.push(`  missing: ${[...missing].sort().join(", ")}`);
  }
  const spare = atlas.unused();
  if (spare.length > 0) {
    log.push(`  atlas slots unused: ${spare.join(", ")}`);
  }
}

function main(): void {
  const log: string[] = [];

  wave(log);
  icons(log);
  icontex(log);
  fonts(log);
  sounds(log);
  xmb(log);

  process.stdout.write(`${log.join("\n")}\n`);
}

main();
