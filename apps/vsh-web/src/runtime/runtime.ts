import { appPath } from "./path.js";
import { FrameClock, SysRtc, daylightAt, hourOf, monthPositionOf } from "@vsh/librtc";
import type { Rtc } from "@vsh/librtc";
import { THEME_COLORS } from "@vsh/content";
import {
  Spline,
  alloc,
  bgOf,
  blend,
  createBackend,
  design,
  environmentAt,
  forMonth,
  hdrOf,
  inverseDisplay,
  lineOf,
  measured,
  verified,
  partOf,
  schedOf,
} from "@vsh/qgl";
import type { BackendId, Preset, QglBackend, QglFrame, Quality } from "@vsh/qgl";
import type { Effect, State } from "@vsh/xmb-plugin";
import { AccelMode, Scalar, focusLightAt } from "@vsh/paf";
import type { Snapshot } from "@vsh/paf";
import { readPreferences, savePreferences } from "./preferences.js";

import { Boot } from "./boot.js";
import { XmbShell } from "./shell.js";
import type { Stage } from "./boot.js";
import { Chain } from "./chain.js";
import { loadResources } from "./catalog.js";
import type { Resources } from "./catalog.js";
import { MENU_START, STARTUP_WAVE_DELAY, startupAt } from "./startup.js";
import { IconMaterials } from "./icon-material.js";
import type { StartupFrame } from "./startup.js";

const TO_LIVE = design(1400);
const BOOT_WAVE_FADE = verified(3000);
const BOOT_LIVE_START = verified(4000);
const BOOT_LIVE_FADE = verified(7500);

const MAX_DPR = design(2);
const BRIGHTNESS_STEP = design(0.1);
const ICON_PREPARE_LEAD = design(600);
const PARTICLE_SOFTNESS = measured(0.9);
const THEME_CHANGE = { durationMs: design(450), accelMode: AccelMode.Decelerate };
const INFORMATION_WAVE_TINT = [
  measured(1.095),
  measured(1.08),
  measured(1.31),
] as const;

export interface RuntimeOpts {
  readonly canvas: HTMLCanvasElement;
  readonly rtc?: Rtc;
  readonly quality?: Quality;
  readonly backend?: BackendId;
  readonly appearance?: "reference" | "calendar";
  readonly target?: EventTarget;
  readonly onEffect?: (effect: Effect) => void;
  readonly onShell?: (shell: XmbShell) => void;
  readonly onStartup?: (frame: StartupFrame) => void;
  readonly onFocusLight?: (light: number) => void;
}

export interface Runtime {
  readonly boot: Boot;
  start(): void;
  dispose(): void;
}

function reducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createRuntime(opts: RuntimeOpts): Runtime {
  const rtc = opts.rtc ?? new SysRtc();
  let preferences = readPreferences();
  let sceneColor = preferences.color;
  let themePending = false;
  let themeFollowsMaterials = false;
  const reference = opts.appearance === "reference";
  const direct = appPath() !== "/";
  const boot = new Boot();
  const clock = new FrameClock();
  let spline: Spline | undefined;
  const palette = alloc();
  const previousPalette = alloc();
  const paletteMix = new Scalar(1);
  const particleGain = new Scalar(preferences.background !== "wallpaper" ? 1 : 0);
  const canvasGain = new Scalar(preferences.background === "wallpaper" ? 0 : 1);
  const brightness = new Scalar(preferences.brightness);
  const linearPalette = new Float32Array(palette.length);
  const abort = new AbortController();

  let backend: QglBackend | undefined;
  let res: Resources | undefined;
  let chain: Chain | undefined;
  let raf = 0;
  let observer: ResizeObserver | undefined;
  let reduced = reducedMotion() || preferences.motion === "reduced";
  let waveMs = 0;
  let shell: XmbShell | undefined;
  let live: Preset | undefined;
  let referencePreset: Preset | undefined;
  let liveMinute = -1;
  let drawRequired = true;
  let disposed = false;
  let startupMs = -1;
  let startupFrame = startupAt(0, false);
  let finishStartup: (() => void) | undefined;
  let shellShown = false;
  let chime: HTMLAudioElement | undefined;
  let normalStarted = false;
  let focusLight = -1;
  let informationAlpha = -1;
  let iconKey = "";
  let iconState: State | undefined;
  let iconMaterials: IconMaterials | undefined;
  let initialMaterialsReady = false;
  let canvasAppearance = "";
  const media = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  const onMotion = (): void => {
    reduced = media.matches || preferences.motion === "reduced";
    drawRequired = true;
  };

  const quality: Quality = opts.quality ?? "standard";

  const fit = (): void => {
    drawRequired = true;
    iconKey = "";
    iconMaterials?.invalidate();
    const rect = opts.canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    const wid = Math.max(1, Math.round(rect.width));
    const hgt = Math.max(1, Math.round(rect.height));

    opts.canvas.width = Math.round(wid * dpr);
    opts.canvas.height = Math.round(hgt * dpr);
    backend?.resize({ wid, hgt, dpr });
  };

  const need = (): Resources => {
    if (res === undefined) {
      throw new Error("resource catalog missing");
    }

    return res;
  };

  const stages: readonly Stage[] = [
    {
      id: "resource catalog",
      state: "initializing",
      run: async (): Promise<void> => {
        res = await loadResources(abort.signal);
        abort.signal.throwIfAborted();
        spline = new Spline(
          reduced || direct || quality === "static"
            ? res.lattice
            : { ...res.lattice, phaseMs: 0 },
        );
        waveMs = reduced || direct || quality === "static" ? 0 : -STARTUP_WAVE_DELAY;
        chain = new Chain(res.cat.coldboot1);
        referencePreset = {
          ...res.cat.night,
          corners: [...res.cat.night.corners.slice(0, 2), ...res.appearance.waveTint],
        };
        if (reference) {
          for (let i = 0; i < res.appearance.background.length; i += 1) {
            const color = res.appearance.background[i];
            if (color !== undefined) palette.set([...color, 255], i * 4);
          }
          live = referencePreset;
        }
      },
    },
    {
      id: "graphics",
      state: "initializing",
      run: async (): Promise<void> => {
        try {
          const loaded = await createBackend(opts.canvas, opts.backend);
          if (disposed) {
            loaded.dispose();
            return;
          }
          backend = loaded;
          opts.canvas.dataset["backend"] = loaded.kind;
          fit();
        } catch {
          opts.canvas.style.background =
            "radial-gradient(ellipse at 10% 100%, #0e002e, #010003 85%)";
        }
      },
    },
    {
      id: "shell resources",
      state: "loading-shell",
      run: async (): Promise<void> => {
        abort.signal.throwIfAborted();
        const r = need();
        spline?.write(lineOf(reduced ? r.cat.night : r.cat.coldboot1), 0);
        if (!reference) {
          blend(forMonth(r.pal, Math.floor(monthPositionOf(rtc))), 0, palette);
        }

        shell = new XmbShell({
          cats: r.shell,
          metrics: r.metrics,
          icons: r.icons,
          target: opts.target ?? globalThis,
          preferences,
          onPreferences: (value) => {
            if (value.color !== preferences.color) {
              themePending =
                !reference &&
                backend !== undefined &&
                iconMaterials?.available === true;
              if (!themePending) {
                previousPalette.set(palette);
                sceneColor = value.color;
                paletteMix.snap(0);
                paletteMix.retarget(1, THEME_CHANGE);
              }
            }
            particleGain.retarget(
              value.background !== "wallpaper" ? 1 : 0,
              THEME_CHANGE,
            );
            canvasGain.retarget(value.background === "wallpaper" ? 0 : 1, THEME_CHANGE);
            brightness.retarget(value.brightness, THEME_CHANGE);
            preferences = value;
            iconKey = "";
            shell?.invalidateMaterials();
            iconMaterials?.invalidate();
            savePreferences(value);
            onMotion();
          },
          onEffect: (effect) => {
            opts.onEffect?.(effect);
          },
        });

        if (r.iconTextures !== undefined && r.iconPalette !== undefined) {
          iconMaterials = new IconMaterials(
            r.iconTextures,
            r.iconPalette,
            (icons) => {
              if (!disposed && shell !== undefined) {
                if (!initialMaterialsReady) {
                  shell.setIcons(icons, { durationMs: 0, accelMode: AccelMode.Linear });
                  initialMaterialsReady = true;
                } else if (themePending) {
                  const preparedColor = preferences.color;
                  let started = false;
                  shell.setIcons(icons, THEME_CHANGE, (progress) => {
                    if (!started) {
                      started = true;
                      previousPalette.set(palette);
                      sceneColor = preparedColor;
                      themePending = false;
                    }
                    themeFollowsMaterials = progress < 1;
                    paletteMix.snap(progress);
                    drawRequired = true;
                  });
                } else shell.setIcons(icons);
                iconMaterials?.retain(shell.retainedIconUrls);
              }
            },
            (error) => {
              initialMaterialsReady = true;
              if (themePending) {
                previousPalette.set(palette);
                sceneColor = preferences.color;
                paletteMix.snap(0);
                paletteMix.retarget(1, THEME_CHANGE);
                themePending = false;
                drawRequired = true;
              }
              if (import.meta.env.DEV)
                console.warn("[qgl]", { event: "icon-material-failed", error });
            },
          );
          if (!iconMaterials.available) initialMaterialsReady = true;
        } else initialMaterialsReady = true;

        await Promise.resolve();
      },
    },
    {
      id: "startup",
      state: "starting",
      run: (): Promise<void> =>
        new Promise((resolve) => {
          startupMs = 0;
          chain?.retarget(need().cat.coldboot2, BOOT_WAVE_FADE);
          finishStartup = resolve;
          if (import.meta.env.DEV && !reduced && !direct && backend !== undefined) {
            chime = new Audio("/original/boot/coldboot.wav");
            chime.volume = 0.45;
            void chime.play().catch(() => undefined);
          }
        }),
    },
  ];

  const frame = (stamp: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (reduced !== (media.matches || preferences.motion === "reduced")) {
      reduced = media.matches || preferences.motion === "reduced";
      drawRequired = true;
    }

    const f = clock.advance(stamp);
    const r = res;
    let c = chain;
    const gl = backend;

    if (r === undefined || c === undefined || spline === undefined) {
      return;
    }

    const hour = hourOf(rtc);
    const month = reference
      ? 9
      : (THEME_COLORS.find((color) => color.value === preferences.color)?.month ??
        monthPositionOf(rtc));
    const sceneMonth = reference
      ? 9
      : (THEME_COLORS.find((color) => color.value === sceneColor)?.month ??
        monthPositionOf(rtc));
    const daylight = reference ? 0 : daylightAt(hour, schedOf(r.cat.day));
    const minute = Math.floor(rtc.now() / 60_000);
    if (!reference && minute !== liveMinute) {
      liveMinute = minute;
      live = environmentAt(r.cat, hour);
    }
    const target = live ?? r.cat.night;
    const starting = startupMs >= 0;

    if (starting) {
      startupMs += f.deltaMs;
      startupFrame = startupAt(
        startupMs,
        reduced || direct || quality === "static" || gl === undefined,
      );
      opts.onStartup?.(startupFrame);
      if (!normalStarted && startupFrame.elapsedMs >= BOOT_LIVE_START) {
        normalStarted = true;
        c.retarget(target, BOOT_LIVE_FADE);
      }
      if (
        !shellShown &&
        initialMaterialsReady &&
        startupFrame.elapsedMs >= MENU_START &&
        shell !== undefined
      ) {
        shellShown = true;
        opts.onShell?.(shell);
      }
      if (startupFrame.done) {
        if (reduced || direct || quality === "static" || gl === undefined) {
          chain = new Chain(target);
          c = chain;
        }
        if (initialMaterialsReady) {
          startupMs = -1;
          finishStartup?.();
          finishStartup = undefined;
        }
        drawRequired = true;
      }
    }

    if (boot.snapshot().state === "ready") {
      if (c.target !== target) c.retarget(target, TO_LIVE);
    }

    shell?.tick(f.deltaMs, reduced, startupFrame.menu > 0);
    const themeMoving =
      themeFollowsMaterials ||
      !paletteMix.done ||
      !particleGain.done ||
      !canvasGain.done ||
      !brightness.done;
    if (!themeFollowsMaterials)
      paletteMix.tick(reduced ? THEME_CHANGE.durationMs : f.deltaMs);
    for (const track of [particleGain, canvasGain, brightness])
      track.tick(reduced ? THEME_CHANGE.durationMs : f.deltaMs);
    if (themeMoving) drawRequired = true;
    if (shell !== undefined) iconMaterials?.retain(shell.retainedIconUrls);
    let nextIconKey: string | undefined;
    let nextIconSnapshot: Snapshot | undefined;
    if (shell?.state !== iconState) {
      iconState = shell?.state;
      iconKey = "";
      iconMaterials?.invalidate();
      shell?.invalidateMaterials();
    }
    const content = shell?.content.snapshot();
    const information =
      content?.pages.some(
        (page) =>
          page.kind === "information" ||
          page.kind === "profile" ||
          page.kind === "browser",
      ) ||
      content?.departing.some(
        (page) =>
          page.kind === "information" ||
          page.kind === "profile" ||
          page.kind === "browser",
      );
    const pageAlpha = information ? (shell?.panelAlpha ?? 0) : 0;
    const canvasAlpha = startupFrame.done
      ? canvasGain.value + (1 - canvasGain.value) * pageAlpha
      : 1;
    const wallpaper = canvasAlpha === 0;
    const particles = particleGain.value > 0 || !startupFrame.done;
    const appearance = `${String(canvasAlpha)}:${String(brightness.value)}`;
    if (appearance !== canvasAppearance) {
      canvasAppearance = appearance;
      opts.canvas.style.opacity = String(canvasAlpha);
      opts.canvas.parentElement?.style.setProperty(
        "--scene-alpha",
        String(canvasAlpha),
      );
      opts.canvas.style.filter = `brightness(${String(2 ** (brightness.value * BRIGHTNESS_STEP))})`;
      drawRequired = true;
    }
    if (pageAlpha !== informationAlpha) {
      informationAlpha = pageAlpha;
      drawRequired = true;
      iconKey = "";
      iconMaterials?.invalidate();
    }
    if (
      iconMaterials !== undefined &&
      shell !== undefined &&
      (startupFrame.done || startupFrame.elapsedMs >= MENU_START - ICON_PREPARE_LEAD) &&
      (pageAlpha === 0 || !initialMaterialsReady) &&
      paletteMix.done &&
      !themeFollowsMaterials &&
      (!themePending || shell.materialSettled) &&
      brightness.done &&
      canvasGain.done &&
      (c.settled || !startupFrame.done) &&
      r.iconTextures !== undefined &&
      r.iconPalette !== undefined
    ) {
      const key = `${startupFrame.done ? "ready" : "startup"}:${reference ? "reference" : String(minute)}:${preferences.background}:${preferences.color}:${String(preferences.brightness)}:${String(shell.state.category)}:${shell.state.levels.join(",")}`;
      if (key !== iconKey) {
        nextIconKey = key;
        nextIconSnapshot = shell.materialSnapshot();
        drawRequired = true;
      }
    }
    if (shell !== undefined && shellShown) {
      const value = focusLightAt(shell.focusTime, reduced);
      if (value !== focusLight) {
        focusLight = value;
        opts.onFocusLight?.(value);
      }
    }
    if (gl === undefined) {
      if (nextIconKey !== undefined && nextIconSnapshot !== undefined) {
        iconKey = nextIconKey;
        iconMaterials?.request(
          nextIconKey,
          nextIconSnapshot,
          startupFrame.done ? target : c.current,
          reference ? 0 : hour / 24,
          month - 1,
        );
      }
      return;
    }
    if (!starting && boot.snapshot().state !== "ready") return;

    const moving = !c.settled;
    const preset: Preset = c.step(f.deltaMs);
    const hdr = hdrOf(preset);
    const targetExposure = hdrOf(referencePreset ?? r.cat.night).exposure;
    const still = reduced || quality === "static" || wallpaper;
    if (still && !starting && !moving && !drawRequired) return;
    drawRequired = false;
    const line = lineOf(preset);
    const part = partOf(preset);

    waveMs += still || (!starting && boot.snapshot().state !== "ready") ? 0 : f.deltaMs;
    const simulationMs = Math.max(0, waveMs);
    spline.write(line, simulationMs, bgOf(preset).fovy);
    if (!reference) {
      blend(
        forMonth(r.pal, Math.floor(sceneMonth)),
        daylight,
        palette,
        forMonth(r.pal, (Math.floor(sceneMonth) % 12) + 1),
        sceneMonth % 1,
      );
      if (paletteMix.value < 1) {
        for (let i = 0; i < palette.length; i += 1)
          palette[i] =
            (previousPalette[i] ?? 0) +
            ((palette[i] ?? 0) - (previousPalette[i] ?? 0)) * paletteMix.value;
      }
    }
    const sampled = reference || !startupFrame.done;
    if (sampled) {
      const frames = r.startup.frames;
      const next = frames.findIndex((entry) => entry.timeMs >= startupFrame.elapsedMs);
      const b = frames[next < 0 ? frames.length - 1 : next];
      const a = frames[Math.max(0, next - 1)] ?? b;
      if (a !== undefined && b !== undefined) {
        const duration = Math.max(1, b.timeMs - a.timeMs);
        const k = Math.min(
          1,
          Math.max(0, (startupFrame.elapsedMs - a.timeMs) / duration),
        );
        const before = frames[Math.max(0, next - 2)] ?? a;
        const after = frames[Math.min(frames.length - 1, next + 1)] ?? b;
        const k2 = k * k;
        const k3 = k2 * k;
        for (let i = 0; i < r.appearance.background.length; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            const av = a.background[i]?.[j] ?? 0;
            const bv = b.background[i]?.[j] ?? 0;
            const m0 =
              ((bv - (before.background[i]?.[j] ?? av)) * duration) /
              Math.max(1, b.timeMs - before.timeMs);
            const m1 =
              after === b
                ? 0
                : (((after.background[i]?.[j] ?? bv) - av) * duration) /
                  Math.max(1, after.timeMs - a.timeMs);
            const value =
              (2 * k3 - 3 * k2 + 1) * av +
              (k3 - 2 * k2 + k) * m0 +
              (-2 * k3 + 3 * k2) * bv +
              (k3 - k2) * m1;
            const sample = startupFrame.done
              ? (r.appearance.background[i]?.[j] ?? 0)
              : Math.min(Math.max(av, bv), Math.max(Math.min(av, bv), value));
            const display = (sample * 0.85 * 0.6 * targetExposure) / 255;
            const captured = inverseDisplay(display, hdr) / (0.85 * 0.6);
            const y = Math.floor(i / 4) / 7;
            const top = preset.corners[1]?.[j] ?? 1;
            const bottom = preset.corners[0]?.[j] ?? 1;
            const corner = top + (bottom - top) * y;
            const nightBias = Math.max(bgOf(preset).nightWhitBias, 0.85);
            const bias = nightBias + (1 - nightBias) * daylight;
            const calendar = (((palette[i * 4 + j] ?? 0) / 255) * corner * bias) / 0.85;
            linearPalette[i * 4 + j] = reference
              ? captured
              : captured + (calendar - captured) * startupFrame.appearance;
          }
          linearPalette[i * 4 + 3] = 1;
        }
      }
    }

    const rendered: QglFrame = {
      no: f.no,
      deltaMs: f.deltaMs,
      elapsedMs: simulationMs,
      scene: {
        corners: (sampled
          ? [[1, 1, 1], [1, 1, 1], ...preset.corners.slice(2)]
          : preset.corners
        ).map((color, index) =>
          index < 2
            ? ([
                color[0] * (1 - pageAlpha),
                color[1] * (1 - pageAlpha),
                color[2] * (1 - pageAlpha),
              ] as const)
            : ([
                color[0] +
                  ((r.cat.night.corners[index]?.[0] ?? 0) * INFORMATION_WAVE_TINT[0] -
                    color[0]) *
                    pageAlpha,
                color[1] +
                  ((r.cat.night.corners[index]?.[1] ?? 0) * INFORMATION_WAVE_TINT[1] -
                    color[1]) *
                    pageAlpha,
                color[2] +
                  ((r.cat.night.corners[index]?.[2] ?? 0) * INFORMATION_WAVE_TINT[2] -
                    color[2]) *
                    pageAlpha,
              ] as const),
        ),
        bg: bgOf(preset),
        hdr,
        line,
        part: {
          ...part,
          globalAlpha:
            part.globalAlpha *
            (1 - pageAlpha) *
            (startupFrame.done ? particleGain.value : 1),
        },
        daylight: sampled ? 0 : daylight,
        palette,
        ...(sampled ? { linearPalette } : {}),
        particleSoftness: PARTICLE_SOFTNESS,
        fresLut: r.lut,
        spline: spline.dat,
        normals: spline.normals,
        quality: reduced ? "static" : quality,
        reducedMotion: reduced,
        waveGain: wallpaper ? 0 : startupFrame.waveGain,
        ...(still && startupFrame.done && particles
          ? {
              particleWarmup: {
                lattice: r.lattice,
                durationMs: r.lattice.phaseMs ?? 0,
              },
            }
          : {}),
        ...(reference
          ? {
              waveTransfer: [
                r.appearance.waveTransfer[0] *
                  startupFrame.appearance *
                  (1 - pageAlpha),
                1 +
                  (r.appearance.waveTransfer[1] - 1) *
                    startupFrame.appearance *
                    (1 - pageAlpha),
                1 +
                  (r.appearance.waveTransfer[2] - 1) *
                    startupFrame.appearance *
                    (1 - pageAlpha),
              ] as const,
            }
          : {}),
      },
    };
    gl.render(rendered);
    if (nextIconKey !== undefined && nextIconSnapshot !== undefined) {
      iconKey = nextIconKey;
      const preparingTheme = themePending;
      if (preparingTheme) {
        const targetPalette = alloc();
        blend(
          forMonth(r.pal, Math.floor(month)),
          daylight,
          targetPalette,
          forMonth(r.pal, (Math.floor(month) % 12) + 1),
          month % 1,
        );
        gl.render({
          ...rendered,
          deltaMs: 0,
          scene: { ...rendered.scene, palette: targetPalette },
        });
      }
      iconMaterials?.request(
        nextIconKey,
        nextIconSnapshot,
        startupFrame.done ? target : preset,
        reference ? 0 : hour / 24,
        month - 1,
        opts.canvas,
      );
      if (preparingTheme) gl.render({ ...rendered, deltaMs: 0 });
    }
  };

  return {
    boot,

    start(): void {
      reduced = reducedMotion() || preferences.motion === "reduced";
      media.addEventListener("change", onMotion);
      observer = new ResizeObserver(fit);
      observer.observe(opts.canvas);

      void boot.run(stages);
      raf = requestAnimationFrame(frame);
    },

    dispose(): void {
      disposed = true;
      media.removeEventListener("change", onMotion);
      abort.abort();
      finishStartup?.();
      finishStartup = undefined;
      chime?.pause();
      chime = undefined;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      iconMaterials?.dispose();
      iconMaterials = undefined;
      backend?.dispose();
      backend = undefined;
      shell?.dispose();
      shell = undefined;
    },
  };
}
