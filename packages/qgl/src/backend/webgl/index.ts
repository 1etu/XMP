import { QglInitError, budgetOf } from "../../frame.js";
import type { QglBackend, QglFrame, Viewport } from "../../frame.js";
import {
  EXPOSURE_SAMPLES,
  glareLayout,
  writeExposure,
  writeGaussian,
  writeGlareWeights,
  writeHalfPalette,
  writeParticleBlur,
} from "../../hdr.js";
import { LUT_W, PAL_H, PAL_W } from "../../palette.js";
import { STEX_H, STEX_W } from "../../lines/spline.js";
import { MAX_PARTICLES, Particles } from "../../particles.js";
import {
  BLUR_FS,
  ACC_FS,
  EXPOSE_FS,
  BG_FS,
  COMP_FS,
  COPY_FS,
  FULLSCREEN_VS,
  GLARE_FS,
  PART_FS,
  PART_VS,
  WAVE_FS,
  WAVE_VS,
} from "./shaders.js";
import { dataTex, dropTarget, grid, quad, target } from "./glutil.js";
import type { Gl, Mesh, Target } from "./glutil.js";
import { pass } from "./pass.js";
import type { GlareLevel, Pass } from "./pass.js";
import {
  COLS,
  PARTICLE_REFERENCE_WIDTH,
  ROWS,
  WAVE_GAIN,
  WAVE_HEIGHT,
  WAVE_WIDTH,
} from "./tune.js";

export class WebglBackend implements QglBackend {
  readonly kind = "webgl" as const;

  #gl: Gl | undefined;
  #bg: Pass | undefined;
  #wave: Pass | undefined;
  #copy: Pass | undefined;
  #part: Pass | undefined;
  #expose: Pass | undefined;
  #acc: Pass | undefined;
  #glare: Pass | undefined;
  #blur: Pass | undefined;
  #comp: Pass | undefined;

  #quadVao: WebGLVertexArrayObject | undefined;
  #waveMesh: Mesh | undefined;
  readonly #particles = new Particles();
  #particleTex: WebGLTexture | undefined;

  #splineTex: WebGLTexture | undefined;
  #normalTex: WebGLTexture | undefined;
  #palTex: WebGLTexture | undefined;
  #lutTex: WebGLTexture | undefined;
  #lutSent = false;
  #exposureTex: WebGLTexture | undefined;
  readonly #exposureData = new Float32Array(EXPOSURE_SAMPLES * 4);
  readonly #kernel = new Float32Array(32);
  readonly #weights = new Float32Array(9);
  readonly #paletteData = new Uint16Array(PAL_W * PAL_H * 4);

  #scene: Target | undefined;
  #waveTarget: Target | undefined;
  #waveMsaa: WebGLFramebuffer | undefined;
  #waveColor: WebGLRenderbuffer | undefined;
  #exposed: Target | undefined;
  #particleA: Target | undefined;
  #particleB: Target | undefined;
  readonly #particleKernel = new Float32Array(32);
  #glareSource: Target | undefined;
  #glareSum: Target | undefined;
  #levels: GlareLevel[] = [];

  #vp: Viewport = { wid: 1, hgt: 1, dpr: 1 };

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });

    if (gl === null) {
      throw new QglInitError("webgl", "context unavailable");
    }

    if (gl.getExtension("EXT_color_buffer_float") === null) {
      throw new QglInitError("webgl", "EXT_color_buffer_float unavailable");
    }

    this.#gl = gl;
    this.#bg = pass(gl, FULLSCREEN_VS, BG_FS, [
      "uCorner0",
      "uCorner1",
      "uCorner2",
      "uCorner3",
      "uPal",
      "uNightWhitBias",
      "uDaylight",
    ]);
    this.#wave = pass(gl, WAVE_VS, WAVE_FS, [
      "uSpline",
      "uNormal",
      "uMipmapBias",
      "uAspect",
      "uFresLut",
      "uFresnel",
      "uBrightness",
      "uGain",
      "uHGrad0",
      "uHGrad1",
    ]);
    this.#copy = pass(gl, FULLSCREEN_VS, COPY_FS, ["uSrc", "uTransfer"]);
    this.#waveTarget = target(gl, WAVE_WIDTH, WAVE_HEIGHT);
    const samples = gl.getInternalformatParameter(
      gl.RENDERBUFFER,
      gl.RGBA16F,
      gl.SAMPLES,
    ) as Int32Array;
    const count = Math.min(4, samples[0] ?? 0);
    if (count > 0) {
      this.#waveMsaa = gl.createFramebuffer();
      this.#waveColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.#waveColor);
      gl.renderbufferStorageMultisample(
        gl.RENDERBUFFER,
        count,
        gl.RGBA16F,
        WAVE_WIDTH,
        WAVE_HEIGHT,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#waveMsaa);
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.RENDERBUFFER,
        this.#waveColor,
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new QglInitError("webgl", "wave antialiasing target unavailable");
      }
    }
    this.#part = pass(gl, PART_VS, PART_FS, ["uParticles", "uAspect", "uGlarePower"]);
    this.#expose = pass(gl, FULLSCREEN_VS, EXPOSE_FS, [
      "uSrc",
      "uExposureLut",
      "uEnabled",
      "uToneBefore",
    ]);
    this.#acc = pass(gl, FULLSCREEN_VS, ACC_FS, ["uSrc", "uWeight"]);
    this.#glare = pass(gl, FULLSCREEN_VS, GLARE_FS, ["uSrc", "uToneBefore"]);
    this.#blur = pass(gl, FULLSCREEN_VS, BLUR_FS, ["uSrc", "uDir", "uWeights[0]"]);
    this.#comp = pass(gl, FULLSCREEN_VS, COMP_FS, [
      "uScene",
      "uGlare",
      "uParticles",
      "uExposure",
      "uWhite",
      "uEnabled",
      "uGlareOnly",
      "uToneBefore",
    ]);
    this.#exposureTex = dataTex(gl, EXPOSURE_SAMPLES, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.#quadVao = quad(gl);
    this.#waveMesh = grid(gl, ROWS, COLS);
    this.#particleTex = dataTex(gl, 4, MAX_PARTICLES, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.#splineTex = dataTex(gl, STEX_W, STEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.#normalTex = dataTex(gl, STEX_W, STEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.#palTex = dataTex(gl, PAL_W, PAL_H, gl.RGBA16F, gl.RGBA, gl.FLOAT);
    this.#lutTex = dataTex(gl, LUT_W, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);

    await this.#particles.load();
  }

  resize(vp: Viewport): void {
    const gl = this.#gl;
    if (gl === undefined) {
      return;
    }

    this.#vp = vp;

    const wid = Math.max(1, Math.round(vp.wid * vp.dpr));
    const hgt = Math.max(1, Math.round(vp.hgt * vp.dpr));

    if (this.#scene !== undefined) dropTarget(gl, this.#scene);
    if (this.#exposed !== undefined) dropTarget(gl, this.#exposed);
    if (this.#particleA !== undefined) dropTarget(gl, this.#particleA);
    if (this.#particleB !== undefined) dropTarget(gl, this.#particleB);
    this.#scene = target(gl, wid, hgt);
    this.#exposed = target(gl, wid, hgt, true);
    this.#particleA = target(gl, wid, hgt);
    this.#particleB = target(gl, wid, hgt);
    this.#dropGlare(gl);
  }

  render(frame: QglFrame): void {
    const gl = this.#gl;
    const scene = this.#scene;
    const exposed = this.#exposed;
    const wave = this.#waveTarget;
    const copy = this.#copy;
    const quadVao = this.#quadVao;

    if (
      gl === undefined ||
      scene === undefined ||
      wave === undefined ||
      copy === undefined ||
      exposed === undefined ||
      quadVao === undefined
    ) {
      return;
    }

    const { scene: s } = frame;
    const budget = budgetOf(s.quality);
    const aspect = Math.max(this.#vp.wid / Math.max(this.#vp.hgt, 1), 0.01);

    this.#upload(gl, frame);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#waveMsaa ?? wave.fbo);
    gl.viewport(0, 0, wave.wid, wave.hgt);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.#drawWave(gl, frame, aspect);
    if (this.#waveMsaa !== undefined) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#waveMsaa);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, wave.fbo);
      gl.blitFramebuffer(
        0,
        0,
        wave.wid,
        wave.hgt,
        0,
        0,
        wave.wid,
        wave.hgt,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, scene.wid, scene.hgt);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.#drawBg(gl, frame, quadVao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(copy.prog);
    gl.bindVertexArray(quadVao);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, wave.tex);
    gl.uniform1i(copy.u["uSrc"] ?? null, 2);
    gl.uniform3fv(copy.u["uTransfer"] ?? null, s.waveTransfer ?? [0, 1, 1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    this.#drawExposure(gl, frame, scene, exposed, quadVao);
    this.#ensureGlare(gl, frame, aspect);
    const sum = this.#glareSum;
    if (sum === undefined) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, sum.fbo);
    gl.viewport(0, 0, sum.wid, sum.hgt);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (budget.glareMips > 0 && s.hdr.enabled > 0.5 && s.hdr.glare > 0.5) {
      this.#drawGlare(gl, frame, exposed, quadVao);
    }
    this.#particlePass(gl, frame, aspect, budget.particles, quadVao);
    this.#composite(gl, frame, exposed, sum, quadVao);
  }

  dispose(): void {
    const gl = this.#gl;
    if (gl === undefined) {
      return;
    }

    for (const t of [this.#scene, this.#exposed, this.#particleA, this.#particleB]) {
      if (t !== undefined) {
        dropTarget(gl, t);
      }
    }

    this.#dropGlare(gl);
    if (this.#exposureTex !== undefined) gl.deleteTexture(this.#exposureTex);
    if (this.#waveTarget !== undefined) dropTarget(gl, this.#waveTarget);
    if (this.#waveMsaa !== undefined) gl.deleteFramebuffer(this.#waveMsaa);
    if (this.#waveColor !== undefined) gl.deleteRenderbuffer(this.#waveColor);

    for (const p of [
      this.#copy,
      this.#bg,
      this.#wave,
      this.#part,
      this.#expose,
      this.#acc,
      this.#glare,
      this.#blur,
      this.#comp,
    ]) {
      if (p !== undefined) {
        gl.deleteProgram(p.prog);
      }
    }

    if (this.#splineTex !== undefined) {
      gl.deleteTexture(this.#splineTex);
    }
    if (this.#normalTex !== undefined) gl.deleteTexture(this.#normalTex);
    if (this.#particleTex !== undefined) gl.deleteTexture(this.#particleTex);
    if (this.#palTex !== undefined) {
      gl.deleteTexture(this.#palTex);
    }
    if (this.#lutTex !== undefined) {
      gl.deleteTexture(this.#lutTex);
    }

    this.#gl = undefined;
  }

  #upload(gl: Gl, frame: QglFrame): void {
    const spline = frame.scene.spline;
    writeHalfPalette(
      frame.scene.linearPalette ?? frame.scene.palette,
      this.#paletteData,
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#splineTex ?? null);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, STEX_W, STEX_H, gl.RGBA, gl.FLOAT, spline);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.#normalTex ?? null);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      STEX_W,
      STEX_H,
      gl.RGBA,
      gl.FLOAT,
      frame.scene.normals,
    );

    if (!this.#lutSent) {
      this.#lutSent = true;
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.#lutTex ?? null);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        LUT_W,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        frame.scene.fresLut,
      );
    }

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.#lutTex ?? null);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#palTex ?? null);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      PAL_W,
      PAL_H,
      gl.RGBA,
      gl.HALF_FLOAT,
      this.#paletteData,
    );
  }

  #drawBg(gl: Gl, frame: QglFrame, vao: WebGLVertexArrayObject): void {
    const p = this.#bg;
    if (p === undefined) {
      return;
    }

    const c = frame.scene.corners;
    const at = (i: number): readonly [number, number, number] => c[i] ?? [0, 0, 0];

    gl.useProgram(p.prog);
    gl.bindVertexArray(vao);
    gl.uniform3fv(p.u["uCorner0"] ?? null, at(0));
    gl.uniform3fv(p.u["uCorner1"] ?? null, at(1));
    gl.uniform3fv(p.u["uCorner2"] ?? null, at(2));
    gl.uniform3fv(p.u["uCorner3"] ?? null, at(3));
    gl.uniform1i(p.u["uPal"] ?? null, 1);
    gl.uniform1f(p.u["uNightWhitBias"] ?? null, frame.scene.bg.nightWhitBias);
    gl.uniform1f(p.u["uDaylight"] ?? null, frame.scene.daylight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #drawWave(gl: Gl, frame: QglFrame, aspect: number): void {
    const p = this.#wave;
    const mesh = this.#waveMesh;
    if (p === undefined || mesh === undefined) {
      return;
    }

    const l = frame.scene.line;
    const c = frame.scene.corners;
    const h0 = c[2] ?? [1, 1, 1];
    const h1 = c[3] ?? h0;

    gl.useProgram(p.prog);
    gl.bindVertexArray(mesh.vao);
    gl.uniform1i(p.u["uSpline"] ?? null, 0);
    gl.uniform1i(p.u["uNormal"] ?? null, 5);
    gl.uniform1i(p.u["uFresLut"] ?? null, 4);
    gl.uniform1f(p.u["uMipmapBias"] ?? null, l.mipmapBias);
    gl.uniform1f(p.u["uAspect"] ?? null, aspect);
    gl.uniform1f(p.u["uFresnel"] ?? null, l.fresnel);
    gl.uniform1f(p.u["uBrightness"] ?? null, l.brightness);
    gl.uniform1f(p.u["uGain"] ?? null, frame.scene.waveGain ?? WAVE_GAIN);
    gl.uniform3fv(p.u["uHGrad0"] ?? null, h0);
    gl.uniform3fv(p.u["uHGrad1"] ?? null, h1);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  #drawParticles(gl: Gl, frame: QglFrame, aspect: number, count: number): void {
    const p = this.#part;
    const vao = this.#quadVao;
    const tex = this.#particleTex;
    if (p === undefined || vao === undefined || tex === undefined) return;
    const data = this.#particles.write(frame, count);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, MAX_PARTICLES, gl.RGBA, gl.FLOAT, data);
    gl.useProgram(p.prog);
    gl.bindVertexArray(vao);
    gl.uniform1i(p.u["uParticles"] ?? null, 6);
    gl.uniform1f(p.u["uAspect"] ?? null, aspect);
    gl.uniform2f(
      p.u["uGlarePower"] ?? null,
      frame.scene.part.glareP1,
      frame.scene.part.glareP2,
    );
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.min(count, MAX_PARTICLES) * 2);
  }

  #particlePass(
    gl: Gl,
    frame: QglFrame,
    aspect: number,
    count: number,
    vao: WebGLVertexArrayObject,
  ): void {
    const a = this.#particleA;
    const b = this.#particleB;
    const blur = this.#blur;
    if (a === undefined || b === undefined || blur === undefined) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
    gl.viewport(0, 0, a.wid, a.hgt);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    if (count > 0) this.#drawParticles(gl, frame, aspect, count);
    gl.disable(gl.BLEND);
    const sigma =
      ((frame.scene.particleSoftness ?? 0) * a.wid) / PARTICLE_REFERENCE_WIDTH;
    if (sigma <= 0) return;
    writeParticleBlur(sigma, this.#particleKernel);
    gl.useProgram(blur.prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(blur.u["uSrc"] ?? null, 2);
    gl.uniform4fv(blur.u["uWeights[0]"] ?? null, this.#particleKernel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
    gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.uniform2f(blur.u["uDir"] ?? null, 1 / a.wid, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
    gl.bindTexture(gl.TEXTURE_2D, b.tex);
    gl.uniform2f(blur.u["uDir"] ?? null, 0, 1 / a.hgt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #dropGlare(gl: Gl): void {
    for (const level of this.#levels) {
      dropTarget(gl, level.source);
      dropTarget(gl, level.horizontal);
      dropTarget(gl, level.vertical);
    }
    this.#levels = [];
    if (this.#glareSource !== undefined) dropTarget(gl, this.#glareSource);
    if (this.#glareSum !== undefined) dropTarget(gl, this.#glareSum);
    this.#glareSource = undefined;
    this.#glareSum = undefined;
  }

  #ensureGlare(gl: Gl, frame: QglFrame, aspect: number): void {
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
    this.#dropGlare(gl);
    this.#glareSum = target(gl, layout.wid, layout.hgt);
    this.#glareSource = target(
      gl,
      layout.wid,
      Math.max(1, Math.round((this.#scene?.hgt ?? 1) / 2)),
    );
    for (let i = 0; i < layout.levels; i += 1) {
      const wid = Math.max(1, layout.wid >> i);
      const hgt = Math.max(1, layout.hgt >> i);
      this.#levels.push({
        source: target(gl, wid, hgt),
        horizontal: target(gl, wid, hgt),
        vertical: target(gl, wid, hgt),
      });
    }
  }

  #drawExposure(
    gl: Gl,
    frame: QglFrame,
    src: Target,
    dst: Target,
    vao: WebGLVertexArrayObject,
  ): void {
    const p = this.#expose;
    if (p === undefined) return;
    writeExposure(frame.scene.hdr, this.#exposureData);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, this.#exposureTex ?? null);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      EXPOSURE_SAMPLES,
      1,
      gl.RGBA,
      gl.FLOAT,
      this.#exposureData,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.wid, dst.hgt);
    gl.bindVertexArray(vao);
    gl.useProgram(p.prog);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(p.u["uSrc"] ?? null, 2);
    gl.uniform1i(p.u["uExposureLut"] ?? null, 7);
    gl.uniform1f(p.u["uEnabled"] ?? null, frame.scene.hdr.enabled);
    gl.uniform1f(p.u["uToneBefore"] ?? null, frame.scene.hdr.tonebefore);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #drawGlare(
    gl: Gl,
    frame: QglFrame,
    scene: Target,
    vao: WebGLVertexArrayObject,
  ): void {
    const glare = this.#glare;
    const blur = this.#blur;
    const acc = this.#acc;
    const source = this.#glareSource;
    const sum = this.#glareSum;
    if (
      glare === undefined ||
      blur === undefined ||
      acc === undefined ||
      source === undefined ||
      sum === undefined
    )
      return;
    const h = frame.scene.hdr;
    writeGaussian(h, this.#kernel);
    writeGlareWeights(h, this.#levels.length, this.#weights);
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, source.fbo);
    gl.viewport(0, 0, source.wid, source.hgt);
    gl.useProgram(glare.prog);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(glare.u["uSrc"] ?? null, 2);
    gl.uniform1f(glare.u["uToneBefore"] ?? null, h.tonebefore);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    let previous = source;
    for (const level of this.#levels) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.source.fbo);
      gl.viewport(0, 0, level.source.wid, level.source.hgt);
      gl.useProgram(acc.prog);
      gl.bindTexture(gl.TEXTURE_2D, previous.tex);
      gl.uniform1i(acc.u["uSrc"] ?? null, 2);
      gl.uniform1f(acc.u["uWeight"] ?? null, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(blur.prog);
      gl.uniform1i(blur.u["uSrc"] ?? null, 2);
      gl.uniform4fv(blur.u["uWeights[0]"] ?? null, this.#kernel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.horizontal.fbo);
      gl.bindTexture(gl.TEXTURE_2D, level.source.tex);
      gl.uniform2f(blur.u["uDir"] ?? null, 1 / level.source.wid, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.vertical.fbo);
      gl.bindTexture(gl.TEXTURE_2D, level.horizontal.tex);
      gl.uniform2f(blur.u["uDir"] ?? null, 0, 1 / level.source.hgt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      previous = level.source;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, sum.fbo);
    gl.viewport(0, 0, sum.wid, sum.hgt);
    gl.useProgram(acc.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.#levels.length - 1; i >= 0; i -= 1) {
      const level = this.#levels[i];
      if (level === undefined) continue;
      gl.bindTexture(gl.TEXTURE_2D, level.vertical.tex);
      gl.uniform1f(acc.u["uWeight"] ?? null, this.#weights[i] ?? 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.BLEND);
  }

  #composite(
    gl: Gl,
    frame: QglFrame,
    scene: Target,
    glare: Target,
    vao: WebGLVertexArrayObject,
  ): void {
    const p = this.#comp;
    if (p === undefined) {
      return;
    }

    const h = frame.scene.hdr;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, scene.wid, scene.hgt);
    gl.useProgram(p.prog);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(p.u["uScene"] ?? null, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, glare.tex);
    gl.uniform1i(p.u["uGlare"] ?? null, 3);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.#particleA?.tex ?? null);
    gl.uniform1i(p.u["uParticles"] ?? null, 6);

    gl.uniform1f(p.u["uExposure"] ?? null, h.exposure);
    gl.uniform1f(p.u["uWhite"] ?? null, h.whiteLevel);
    gl.uniform1f(p.u["uEnabled"] ?? null, h.enabled);
    gl.uniform1f(p.u["uGlareOnly"] ?? null, h.glareOnly);
    gl.uniform1f(p.u["uToneBefore"] ?? null, h.tonebefore);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
