import { QglInitError } from "../../frame.js";

export type Gl = WebGL2RenderingContext;
export type Uniforms = Readonly<Record<string, WebGLUniformLocation | null>>;

export interface Target {
  readonly tex: WebGLTexture;
  readonly fbo: WebGLFramebuffer;
  readonly wid: number;
  readonly hgt: number;
}

export interface Mesh {
  readonly vao: WebGLVertexArrayObject;
  readonly rows: number;
  readonly cols: number;
  readonly count: number;
}

function shader(gl: Gl, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);

  if (sh === null) {
    throw new QglInitError("webgl", "cannot create shader");
  }

  gl.shaderSource(sh, src);
  gl.compileShader(sh);

  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "";
    gl.deleteShader(sh);
    throw new QglInitError("webgl", `shader: ${log}`);
  }

  return sh;
}

export function program(gl: Gl, vsSrc: string, fsSrc: string): WebGLProgram {
  const prog = gl.createProgram();
  const vs = shader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSrc);

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "";
    gl.deleteProgram(prog);
    throw new QglInitError("webgl", `link: ${log}`);
  }

  return prog;
}

export function uniforms(
  gl: Gl,
  prog: WebGLProgram,
  names: readonly string[],
): Uniforms {
  const out: Record<string, WebGLUniformLocation | null> = {};

  for (const n of names) {
    out[n] = gl.getUniformLocation(prog, n);
  }

  return out;
}

export function quad(gl: Gl): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return vao;
}

export function grid(gl: Gl, rows: number, cols: number): Mesh {
  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();
  const ebo = gl.createBuffer();

  const verts = new Float32Array(rows * cols * 2);
  let p = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      verts[p] = c / Math.max(1, cols - 1);
      verts[p + 1] = r / Math.max(1, rows - 1);
      p += 2;
    }
  }

  const idx = new Uint16Array((rows - 1) * (cols - 1) * 6);
  let q = 0;

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      const b = a + cols;
      idx[q] = a;
      idx[q + 1] = b;
      idx[q + 2] = a + 1;
      idx[q + 3] = a + 1;
      idx[q + 4] = b;
      idx[q + 5] = b + 1;
      q += 6;
    }
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  return { vao, rows, cols, count: idx.length };
}

export function points(gl: Gl, n: number): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();

  const ids = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    ids[i] = i;
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return vao;
}

export function target(gl: Gl, wid: number, hgt: number, unorm = false): Target {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    unorm ? gl.RGBA8 : gl.RGBA16F,
    wid,
    hgt,
    0,
    gl.RGBA,
    unorm ? gl.UNSIGNED_BYTE : gl.HALF_FLOAT,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new QglInitError("webgl", `framebuffer incomplete: ${String(status)}`);
  }

  return { tex, fbo, wid, hgt };
}

export function dropTarget(gl: Gl, t: Target): void {
  gl.deleteFramebuffer(t.fbo);
  gl.deleteTexture(t.tex);
}

export function dataTex(
  gl: Gl,
  wid: number,
  hgt: number,
  internal: number,
  format: number,
  type: number,
): WebGLTexture {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, wid, hgt, 0, format, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return tex;
}
