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
