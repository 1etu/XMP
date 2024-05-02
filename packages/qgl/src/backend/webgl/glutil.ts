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
