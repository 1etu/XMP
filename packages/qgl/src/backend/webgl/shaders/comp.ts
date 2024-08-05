import { DITHER_GLSL } from "./dither.js";

export const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uScene;
uniform sampler2D uGlare;
uniform sampler2D uParticles;
uniform float uExposure;
uniform float uWhite;
uniform float uEnabled;
uniform float uGlareOnly;
uniform float uToneBefore;
${DITHER_GLSL}
void main() {
  vec3 scene = texture(uScene, vUv).rgb;
  vec3 glare = texture(uGlare, vUv).rgb;
  if (uEnabled > 0.5 && uToneBefore > 0.5) scene -= dither(textureSize(uScene, 0));
  if (uEnabled > 0.5 && uToneBefore < 0.5) {
    vec3 c = scene * uExposure;
    scene = c * (1.0 + c / max(uWhite * uWhite, 0.000001)) / (1.0 + c);
  }
  vec3 display = clamp(mix(scene + glare, glare, uGlareOnly), 0.0, 1.0);
  oColor = vec4(clamp(display + texture(uParticles, vUv).rgb, 0.0, 1.0), 1.0);
}`;
