import { program, uniforms } from "./glutil.js";
import type { Gl, Target, Uniforms } from "./glutil.js";

export interface Pass {
  readonly prog: WebGLProgram;
  readonly u: Uniforms;
}

export interface GlareLevel {
  readonly source: Target;
  readonly horizontal: Target;
  readonly vertical: Target;
}
