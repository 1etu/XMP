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

export function pass(gl: Gl, vs: string, fs: string, names: readonly string[]): Pass {
  const prog = program(gl, vs, fs);

  return { prog, u: uniforms(gl, prog, names) };
}
