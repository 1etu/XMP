import { QglInitError, budgetOf } from "../../frame.js";
import type { QglBackend, QglFrame, Viewport } from "../../frame.js";
import { STEX_H, STEX_W } from "../../lines/spline.js";
import {
  EXPOSURE_SAMPLES,
  glareLayout,
  writeExposure,
  writeGaussian,
  writeGlareWeights,
  writeParticleBlur,
  writeHalfPalette,
} from "../../hdr.js";
import { LUT_W, PAL_H, PAL_W } from "../../palette.js";
import { design, measured } from "@vsh/resource";
import { MAX_PARTICLES, PARTICLE_FLOATS, Particles } from "../../particles.js";
import { BG_WGSL, PART_WGSL, POST_WGSL, WAVE_WGSL } from "./shaders.js";

const ROWS = measured(128);
const COLS = measured(128);
const WAVE_GAIN = design(1.6);
const PARTICLE_REFERENCE_WIDTH = measured(1280);
const WAVE_WIDTH = measured(1440);
const WAVE_HEIGHT = measured(592);

const HDR_FORMAT: GPUTextureFormat = "rgba16float";
const UBO_FLOATS = 48;
const UBO_BYTES = UBO_FLOATS * 4;

const ADD: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one", operation: "add" },
  alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
};

interface Surface {
  readonly tex: GPUTexture;
  readonly view: GPUTextureView;
  readonly wid: number;
  readonly hgt: number;
}

interface GlareLevel {
  readonly source: Surface;
  readonly horizontal: Surface;
  readonly vertical: Surface;
  readonly blurH: Stage;
  readonly blurV: Stage;
  readonly acc: Stage;
}

interface Stage {
  readonly pipe: GPURenderPipeline;
  readonly ubo: GPUBuffer;
  readonly data: Float32Array<ArrayBuffer>;
}

function surface(
  dev: GPUDevice,
  wid: number,
  hgt: number,
  format: GPUTextureFormat = HDR_FORMAT,
): Surface {
  const tex = dev.createTexture({
    size: { width: wid, height: hgt },
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  return { tex, view: tex.createView(), wid, hgt };
}

export class WebgpuBackend implements QglBackend {
  readonly kind = "webgpu" as const;

  readonly #given: GPUDevice | undefined;

  constructor(dev?: GPUDevice) {
    this.#given = dev;
  }

  #dev: GPUDevice | undefined;
  #ctx: GPUCanvasContext | undefined;
  #format: GPUTextureFormat = "bgra8unorm";
  #samp: GPUSampler | undefined;

  #bg: Stage | undefined;
  #wave: Stage | undefined;
  #copy: Stage | undefined;
  #part: Stage | undefined;
  #expose: Stage | undefined;
  #down: Stage | undefined;
  #acc: Stage | undefined;
  #glare: Stage | undefined;
  #blurH: Stage | undefined;
  #blurV: Stage | undefined;
  #comp: Stage | undefined;

  readonly #particles = new Particles();
  #particleBuffer: GPUBuffer | undefined;
  #spline: GPUBuffer | undefined;
  #normals: GPUBuffer | undefined;
  #waveTarget: Surface | undefined;
  #waveMsaa: GPUTexture | undefined;
  #pal: GPUTexture | undefined;
  #scene: Surface | undefined;
  #exposed: Surface | undefined;
  #particleA: Surface | undefined;
  #particleB: Surface | undefined;
  #particleBlurH: Stage | undefined;
  #particleBlurV: Stage | undefined;
  readonly #particleKernel = new Float32Array(32);
  #glareSource: Surface | undefined;
  #glareSum: Surface | undefined;
  #levels: GlareLevel[] = [];
  #exposureTex: GPUTexture | undefined;
  readonly #exposureData = new Float32Array(EXPOSURE_SAMPLES * 4);
  readonly #kernel = new Float32Array(32);
  readonly #weights = new Float32Array(9);
  readonly #paletteData = new Uint16Array(PAL_W * PAL_H * 4);

  #vp: Viewport = { wid: 1, hgt: 1, dpr: 1 };
  #lut: GPUTexture | undefined;
  #lutSent = false;
  #index: GPUBuffer | undefined;
  #indexCount = 0;
  #fault: string | undefined;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const gpu = navigator.gpu as GPU | undefined;

    if (gpu === undefined) {
      throw new QglInitError("webgpu", "navigator.gpu unavailable");
    }

    let dev = this.#given;

    if (dev === undefined) {
      const adapter = await gpu.requestAdapter({
        powerPreference: "high-performance",
      });

      if (adapter === null) {
        throw new QglInitError("webgpu", "no adapter");
      }

      dev = await adapter.requestDevice();
    }

    this.#dev = dev;
    this.#format = gpu.getPreferredCanvasFormat();

    this.#samp = dev.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    dev.addEventListener("uncapturederror", (ev) => {
      this.#fault ??= ev.error.message;
      console.error(`[qgl] ${ev.error.message}`);
    });

    this.#spline = dev.createBuffer({
      size: STEX_W * STEX_H * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.#normals = dev.createBuffer({
      size: STEX_W * STEX_H * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.#particleBuffer = dev.createBuffer({
      size: MAX_PARTICLES * PARTICLE_FLOATS * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.#waveTarget = surface(dev, WAVE_WIDTH, WAVE_HEIGHT);
    this.#waveMsaa = dev.createTexture({
      size: { width: WAVE_WIDTH, height: WAVE_HEIGHT },
      format: HDR_FORMAT,
      sampleCount: 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.#pal = dev.createTexture({
      size: { width: PAL_W, height: PAL_H },
      format: "rgba16float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.#lut = dev.createTexture({
      size: { width: LUT_W, height: 1 },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const bgMod = dev.createShaderModule({ code: BG_WGSL });
    const waveMod = dev.createShaderModule({ code: WAVE_WGSL });
    const partMod = dev.createShaderModule({ code: PART_WGSL });
    const postMod = dev.createShaderModule({ code: POST_WGSL });

    this.#bg = this.#stage(dev, bgMod, "vs", "fs", HDR_FORMAT, "triangle-strip");
    this.#wave = this.#stage(
      dev,
      waveMod,
      "vs",
      "fs",
      HDR_FORMAT,
      "triangle-list",
      ADD,
      4,
    );
    this.#copy = this.#stage(
      dev,
      postMod,
      "vs",
      "copy",
      HDR_FORMAT,
      "triangle-strip",
      ADD,
    );
    this.#index = this.#gridIndex(dev);
    this.#part = this.#stage(
      dev,
      partMod,
      "vs",
      "fs",
      HDR_FORMAT,
      "triangle-strip",
      ADD,
    );
    this.#exposureTex = dev.createTexture({
      size: { width: EXPOSURE_SAMPLES, height: 1 },
      format: "rgba32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.#expose = this.#stage(
      dev,
      postMod,
      "vs",
      "expose",
      "rgba8unorm",
      "triangle-strip",
    );
    this.#down = this.#stage(
      dev,
      postMod,
      "vs",
      "accumulate",
      HDR_FORMAT,
      "triangle-strip",
    );
    this.#down.data[0] = 1;
    this.#push(dev, this.#down);
    this.#acc = this.#stage(
      dev,
      postMod,
      "vs",
      "accumulate",
      HDR_FORMAT,
      "triangle-strip",
      ADD,
    );
    this.#glare = this.#stage(
      dev,
      postMod,
      "vs",
      "glare",
      HDR_FORMAT,
      "triangle-strip",
    );
    this.#blurH = this.#stage(dev, postMod, "vs", "blur", HDR_FORMAT, "triangle-strip");
    this.#blurV = this.#stage(dev, postMod, "vs", "blur", HDR_FORMAT, "triangle-strip");
    this.#particleBlurH = this.#instance(dev, this.#blurH);
    this.#particleBlurV = this.#instance(dev, this.#blurV);
    this.#comp = this.#stage(
      dev,
      postMod,
      "vs",
      "composite",
      this.#format,
      "triangle-strip",
    );

    const ctx = canvas.getContext("webgpu");

    if (ctx === null) {
      throw new QglInitError("webgpu", "context unavailable");
    }

    this.#ctx = ctx;
    ctx.configure({ device: dev, format: this.#format, alphaMode: "opaque" });
    await this.#particles.load();
  }

  resize(vp: Viewport): void {
    const dev = this.#dev;
    if (dev === undefined) {
      return;
    }

    this.#vp = vp;

    const wid = Math.max(1, Math.round(vp.wid * vp.dpr));
    const hgt = Math.max(1, Math.round(vp.hgt * vp.dpr));
    this.#scene?.tex.destroy();
    this.#exposed?.tex.destroy();
    this.#particleA?.tex.destroy();
    this.#particleB?.tex.destroy();
    this.#scene = surface(dev, wid, hgt);
    this.#exposed = surface(dev, wid, hgt, "rgba8unorm");
    this.#particleA = surface(dev, wid, hgt);
    this.#particleB = surface(dev, wid, hgt);
    this.#dropGlare();
  }

  render(frame: QglFrame): void {
    const dev = this.#dev;
    const ctx = this.#ctx;
    const scene = this.#scene;
    const exposed = this.#exposed;
    const waveTarget = this.#waveTarget;

    if (
      this.#fault !== undefined ||
      dev === undefined ||
      ctx === undefined ||
      scene === undefined ||
      waveTarget === undefined ||
      exposed === undefined
    ) {
      return;
    }

    const s = frame.scene;
    const budget = budgetOf(s.quality);
    const aspect = Math.max(this.#vp.wid / Math.max(this.#vp.hgt, 1), 0.01);

    this.#upload(dev, s.spline, s.normals, s.linearPalette ?? s.palette, s.fresLut);

    this.#ensureGlare(dev, frame, aspect);
    const sum = this.#glareSum;
    if (sum === undefined) return;
    const enc = dev.createCommandEncoder();
    this.#wavePass(dev, enc, frame, waveTarget, aspect);
    this.#scenePass(dev, enc, frame, scene, waveTarget);
    this.#exposurePass(dev, enc, frame, scene, exposed);
    this.#clear(enc, sum);
    if (budget.glareMips > 0 && s.hdr.enabled > 0.5 && s.hdr.glare > 0.5) {
      this.#glarePass(dev, enc, frame, exposed);
    }
    this.#particlePass(dev, enc, frame, aspect, budget.particles);
    this.#compositePass(dev, enc, frame, ctx, exposed, sum);
    dev.queue.submit([enc.finish()]);
  }

  dispose(): void {
    for (const s of [this.#scene, this.#exposed, this.#particleA, this.#particleB]) {
      s?.tex.destroy();
    }
    this.#dropGlare();
    this.#exposureTex?.destroy();
    this.#waveTarget?.tex.destroy();
    this.#waveMsaa?.destroy();
    this.#spline?.destroy();
    this.#normals?.destroy();
    this.#particleBuffer?.destroy();
    this.#pal?.destroy();
    this.#lut?.destroy();
    this.#index?.destroy();
    this.#dev?.destroy();
    this.#dev = undefined;
  }

  #gridIndex(dev: GPUDevice): GPUBuffer {
    const idx = new Uint16Array((ROWS - 1) * (COLS - 1) * 6);
    let q = 0;

    for (let r = 0; r < ROWS - 1; r += 1) {
      for (let c = 0; c < COLS - 1; c += 1) {
        const a = r * COLS + c;
        const b = a + COLS;
        idx[q] = a;
        idx[q + 1] = b;
        idx[q + 2] = a + 1;
        idx[q + 3] = a + 1;
        idx[q + 4] = b;
        idx[q + 5] = b + 1;
        q += 6;
      }
    }

    this.#indexCount = idx.length;

    const buf = dev.createBuffer({
      size: Math.ceil(idx.byteLength / 4) * 4,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    dev.queue.writeBuffer(buf, 0, idx);

    return buf;
  }

  #stage(
    dev: GPUDevice,
    mod: GPUShaderModule,
    vs: string,
    fs: string,
    format: GPUTextureFormat,
    topology: GPUPrimitiveTopology,
    blend?: GPUBlendState,
    sampleCount = 1,
  ): Stage {
    const pipe = dev.createRenderPipeline({
      layout: "auto",
      vertex: { module: mod, entryPoint: vs },
      fragment: {
        module: mod,
        entryPoint: fs,
        targets: [blend === undefined ? { format } : { format, blend }],
      },
      primitive: { topology },
      multisample: { count: sampleCount },
    });

    return {
      pipe,
      ubo: dev.createBuffer({
        size: UBO_BYTES,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      data: new Float32Array(UBO_FLOATS),
    };
  }

  #bind(
    dev: GPUDevice,
    stage: Stage,
    tex?: GPUTextureView,
    aux?: GPUTextureView,
    exposure?: GPUTextureView,
    particles?: GPUTextureView,
  ): GPUBindGroup {
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: stage.ubo } },
    ];

    if (this.#samp !== undefined && tex !== undefined) {
      entries.push({ binding: 1, resource: this.#samp });
      entries.push({ binding: 2, resource: tex });
    }
    if (aux !== undefined) {
      entries.push({ binding: 3, resource: aux });
    }

    if (exposure !== undefined) entries.push({ binding: 4, resource: exposure });
    if (particles !== undefined) entries.push({ binding: 5, resource: particles });

    return dev.createBindGroup({
      layout: stage.pipe.getBindGroupLayout(0),
      entries,
    });
  }

  #push(dev: GPUDevice, stage: Stage): void {
    dev.queue.writeBuffer(stage.ubo, 0, stage.data);
  }

  #upload(
    dev: GPUDevice,
    spline: Float32Array<ArrayBuffer>,
    normals: Float32Array<ArrayBuffer>,
    palette: Uint8Array<ArrayBuffer> | Float32Array<ArrayBuffer>,
    lut: Uint8Array<ArrayBuffer>,
  ): void {
    if (this.#spline !== undefined) {
      dev.queue.writeBuffer(this.#spline, 0, spline);
    }
    if (this.#normals !== undefined) dev.queue.writeBuffer(this.#normals, 0, normals);

    if (this.#pal !== undefined) {
      writeHalfPalette(palette, this.#paletteData);
      dev.queue.writeTexture(
        { texture: this.#pal },
        this.#paletteData,
        { bytesPerRow: PAL_W * 8 },
        { width: PAL_W, height: PAL_H },
      );
    }

    if (this.#lut !== undefined && !this.#lutSent) {
      this.#lutSent = true;
      dev.queue.writeTexture(
        { texture: this.#lut },
        lut,
        { bytesPerRow: LUT_W * 4 },
        { width: LUT_W, height: 1 },
      );
    }
  }

  #clear(enc: GPUCommandEncoder, s: Surface): void {
    enc
      .beginRenderPass({
        colorAttachments: [
          {
            view: s.view,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      })
      .end();
  }

  #wavePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    dst: Surface,
    aspect: number,
  ): void {
    const wave = this.#wave;
    const spline = this.#spline;
    const normals = this.#normals;
    const index = this.#index;
    const lut = this.#lut;
    const sampler = this.#samp;
    const msaa = this.#waveMsaa;
    if (
      wave === undefined ||
      spline === undefined ||
      normals === undefined ||
      index === undefined ||
      lut === undefined ||
      sampler === undefined ||
      msaa === undefined
    )
      return;

    const s = frame.scene;
    const g0 = s.corners[2] ?? [1, 1, 1];
    const g1 = s.corners[3] ?? g0;
    wave.data.set([s.line.fresnel, s.line.brightness, s.line.mipmapBias, 0], 0);
    wave.data.set([0, aspect, s.waveGain ?? WAVE_GAIN, 0], 4);
    wave.data.set([...g0, 0], 8);
    wave.data.set([...g1, 0], 12);
    this.#push(dev, wave);

    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: msaa.createView(),
          resolveTarget: dst.view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(wave.pipe);
    pass.setBindGroup(
      0,
      dev.createBindGroup({
        layout: wave.pipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: wave.ubo } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: { buffer: spline } },
          { binding: 3, resource: lut.createView() },
          { binding: 4, resource: { buffer: normals } },
        ],
      }),
    );
    pass.setIndexBuffer(index, "uint16");
    pass.drawIndexed(this.#indexCount);
    pass.end();
  }

  #scenePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    scene: Surface,
    waveTarget: Surface,
  ): void {
    const bg = this.#bg;
    const copy = this.#copy;
    const pal = this.#pal;
    if (bg === undefined || copy === undefined || pal === undefined) {
      return;
    }

    const s = frame.scene;
    const at = (i: number): readonly [number, number, number] =>
      s.corners[i] ?? [0, 0, 0];

    for (let i = 0; i < 4; i += 1) {
      const c = at(i);
      bg.data.set([c[0], c[1], c[2], 1], i * 4);
    }
    bg.data.set([s.bg.nightWhitBias, s.daylight, 0, 0], 16);
    this.#push(dev, bg);

    copy.data[0] = 1;
    copy.data.set(s.waveTransfer ?? [0, 1, 1], 1);
    this.#push(dev, copy);

    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: scene.view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(bg.pipe);
    pass.setBindGroup(0, this.#bind(dev, bg, pal.createView()));
    pass.draw(4);

    pass.setPipeline(copy.pipe);
    pass.setBindGroup(0, this.#bind(dev, copy, waveTarget.view));
    pass.draw(4);

    pass.end();
  }

  #dropGlare(): void {
    for (const level of this.#levels) {
      level.source.tex.destroy();
      level.horizontal.tex.destroy();
      level.vertical.tex.destroy();
      level.blurH.ubo.destroy();
      level.blurV.ubo.destroy();
      level.acc.ubo.destroy();
    }
    this.#levels = [];
    this.#glareSource?.tex.destroy();
    this.#glareSum?.tex.destroy();
    this.#glareSource = undefined;
    this.#glareSum = undefined;
  }

  #instance(dev: GPUDevice, stage: Stage): Stage {
    return {
      pipe: stage.pipe,
      ubo: dev.createBuffer({
        size: UBO_BYTES,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      data: new Float32Array(UBO_FLOATS),
    };
  }

  #ensureGlare(dev: GPUDevice, frame: QglFrame, aspect: number): void {
    const layout = glareLayout(
      frame.scene.hdr,
      aspect,
      budgetOf(frame.scene.quality).glareMips,
    );
    if (
      this.#glareSum?.wid === layout.wid &&
      this.#glareSum.hgt === layout.hgt &&
      this.#levels.length === layout.levels
    )
      return;
    const h = this.#blurH;
    const v = this.#blurV;
    const acc = this.#acc;
    if (h === undefined || v === undefined || acc === undefined) return;
    this.#dropGlare();
    this.#glareSum = surface(dev, layout.wid, layout.hgt);
    this.#glareSource = surface(
      dev,
      layout.wid,
      Math.max(1, Math.round((this.#scene?.hgt ?? 1) / 2)),
    );
    for (let i = 0; i < layout.levels; i += 1) {
      const wid = Math.max(1, layout.wid >> i);
      const hgt = Math.max(1, layout.hgt >> i);
      this.#levels.push({
        source: surface(dev, wid, hgt),
        horizontal: surface(dev, wid, hgt),
        vertical: surface(dev, wid, hgt),
        blurH: this.#instance(dev, h),
        blurV: this.#instance(dev, v),
        acc: this.#instance(dev, acc),
      });
    }
  }

  #exposurePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    src: Surface,
    dst: Surface,
  ): void {
    const stage = this.#expose;
    const lut = this.#exposureTex;
    if (stage === undefined || lut === undefined) return;
    writeExposure(frame.scene.hdr, this.#exposureData);
    dev.queue.writeTexture(
      { texture: lut },
      this.#exposureData,
      { bytesPerRow: EXPOSURE_SAMPLES * 16 },
      { width: EXPOSURE_SAMPLES, height: 1 },
    );
    stage.data.set([frame.scene.hdr.enabled, frame.scene.hdr.tonebefore, 0, 0]);
    this.#push(dev, stage);
    this.#post(dev, enc, stage, dst, src.view, false, lut.createView());
  }

  #glarePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    scene: Surface,
  ): void {
    const glare = this.#glare;
    const down = this.#down;
    const source = this.#glareSource;
    const sum = this.#glareSum;
    if (
      glare === undefined ||
      down === undefined ||
      source === undefined ||
      sum === undefined
    )
      return;
    const h = frame.scene.hdr;
    writeGaussian(h, this.#kernel);
    writeGlareWeights(h, this.#levels.length, this.#weights);
    glare.data.set([h.tonebefore, 0, 0, 0]);
    this.#push(dev, glare);
    this.#post(dev, enc, glare, source, scene.view);
    let previous = source;
    for (const level of this.#levels) {
      this.#post(dev, enc, down, level.source, previous.view);
      level.blurH.data.set([1 / level.source.wid, 0, 0, 0]);
      level.blurH.data.set(this.#kernel, 12);
      this.#push(dev, level.blurH);
      this.#post(dev, enc, level.blurH, level.horizontal, level.source.view);
      level.blurV.data.set([0, 1 / level.source.hgt, 0, 0]);
      level.blurV.data.set(this.#kernel, 12);
      this.#push(dev, level.blurV);
      this.#post(dev, enc, level.blurV, level.vertical, level.horizontal.view);
      previous = level.source;
    }
    for (let i = this.#levels.length - 1; i >= 0; i -= 1) {
      const level = this.#levels[i];
      if (level === undefined) continue;
      level.acc.data[0] = this.#weights[i] ?? 0;
      this.#push(dev, level.acc);
      this.#post(dev, enc, level.acc, sum, level.vertical.view, true);
    }
  }

  #post(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    stage: Stage,
    dst: Surface,
    src: GPUTextureView,
    load = false,
    exposure?: GPUTextureView,
  ): void {
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: dst.view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: load ? "load" : "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(stage.pipe);
    pass.setBindGroup(0, this.#bind(dev, stage, src, undefined, exposure));
    pass.draw(4);
    pass.end();
  }

  #particlePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    aspect: number,
    count: number,
  ): void {
    const part = this.#part;
    const buffer = this.#particleBuffer;
    const a = this.#particleA;
    const b = this.#particleB;
    const blurH = this.#particleBlurH;
    const blurV = this.#particleBlurV;
    if (
      part === undefined ||
      buffer === undefined ||
      a === undefined ||
      b === undefined ||
      blurH === undefined ||
      blurV === undefined
    )
      return;
    part.data.set([aspect, frame.scene.part.glareP1, frame.scene.part.glareP2, 0]);
    this.#push(dev, part);
    dev.queue.writeBuffer(buffer, 0, this.#particles.write(frame, count));
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: a.view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    if (count > 0) {
      pass.setPipeline(part.pipe);
      pass.setBindGroup(
        0,
        dev.createBindGroup({
          layout: part.pipe.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: part.ubo } },
            { binding: 1, resource: { buffer } },
          ],
        }),
      );
      pass.draw(4, Math.min(count, MAX_PARTICLES) * 2);
    }
    pass.end();
    const sigma =
      ((frame.scene.particleSoftness ?? 0) * a.wid) / PARTICLE_REFERENCE_WIDTH;
    if (sigma <= 0) return;
    writeParticleBlur(sigma, this.#particleKernel);
    blurH.data.set([1 / a.wid, 0, 0, 0]);
    blurH.data.set(this.#particleKernel, 12);
    this.#push(dev, blurH);
    this.#post(dev, enc, blurH, b, a.view);
    blurV.data.set([0, 1 / a.hgt, 0, 0]);
    blurV.data.set(this.#particleKernel, 12);
    this.#push(dev, blurV);
    this.#post(dev, enc, blurV, a, b.view);
  }

  #compositePass(
    dev: GPUDevice,
    enc: GPUCommandEncoder,
    frame: QglFrame,
    ctx: GPUCanvasContext,
    scene: Surface,
    glare: Surface,
  ): void {
    const comp = this.#comp;
    if (comp === undefined) {
      return;
    }

    const h = frame.scene.hdr;

    comp.data.set([h.exposure, h.whiteLevel, h.glareLevel, h.glareOnly], 0);
    comp.data.set([h.tonebefore, h.enabled, 0, 0], 4);
    this.#push(dev, comp);

    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(comp.pipe);
    pass.setBindGroup(
      0,
      this.#bind(dev, comp, scene.view, glare.view, undefined, this.#particleA?.view),
    );
    pass.draw(4);
    pass.end();
  }
}
