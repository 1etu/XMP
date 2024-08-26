import { DITHER_GLSL } from "./dither.js";

export const EXPOSE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform sampler2D uExposureLut;
uniform float uEnabled;
uniform float uToneBefore;
${DITHER_GLSL}
float value(int i, int channel) {
  return texelFetch(uExposureLut, ivec2(min(i, 127), 0), 0)[channel];
}
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  if (uEnabled < 0.5 || uToneBefore < 0.5) { oColor = vec4(c, 0.0); return; }
  vec3 q = clamp(c * 8.0 - 0.5, 0.0, 127.0);
  ivec3 lo = ivec3(floor(q));
  vec3 f = fract(q);
  vec3 display = vec3(
    mix(value(lo.r, 0), value(lo.r + 1, 0), f.r),
    mix(value(lo.g, 0), value(lo.g + 1, 0), f.g),
    mix(value(lo.b, 0), value(lo.b + 1, 0), f.b));
  float m = max(q.r, q.g);
  int j = int(floor(m));
  float mask = mix(
    mix(value(max(lo.b, j), 1), value(max(lo.b + 1, j), 1), f.b),
    mix(value(max(lo.b, j + 1), 1), value(max(lo.b + 1, j + 1), 1), f.b), fract(m));
  oColor = clamp(vec4(display + dither(textureSize(uSrc, 0)), mask), 0.0, 1.0);
}`;

export const GLARE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform float uToneBefore;
void main() {
  vec4 c = texture(uSrc, vUv);
  oColor = vec4(c.rgb * (uToneBefore > 0.5 ? c.a * 8.0 : 1.0), 1.0);
}`;

export const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform vec4 uWeights[8];
void main() {
  vec3 sum = texture(uSrc, vUv).rgb * uWeights[0].rgb;
  for (int i = 1; i < 8; i++) {
    vec2 d = uDir * float(i);
    sum += (texture(uSrc, vUv + d).rgb + texture(uSrc, vUv - d).rgb) * uWeights[i].rgb;
  }
  oColor = vec4(sum, 1.0);
}`;

export const ACC_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform float uWeight;
void main() { oColor = vec4(texture(uSrc, vUv).rgb * uWeight, 0.0); }
`;
