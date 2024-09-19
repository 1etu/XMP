export const WAVE_VS = `#version 300 es
precision highp sampler2D;
layout(location = 0) in vec2 aGrid;
centroid out float vT;
centroid out float vK;
centroid out float vFade;
centroid out float vX;
uniform sampler2D uSpline;
uniform sampler2D uNormal;
uniform float uMipmapBias;
uniform float uAspect;

void main() {
  ivec2 cell = ivec2(round(aGrid * 127.0));
  vec4 p = texelFetch(uSpline, cell, 0);
  vec3 nRaw = texelFetch(uNormal, cell, 0).xyz;
  vec3 n = nRaw / max(length(nRaw), 0.000001);
  vec3 v = normalize(p.xyz);
  float k = uMipmapBias * abs(dot(v, nRaw)) / length(p.xyz);
  vT = abs(dot(n, v)) * k;
  vK = k;
  vFade = min(1.0, 10.0 * min(aGrid.x, 1.0 - aGrid.x))
    * min(1.0, 10.0 * min(aGrid.y, 1.0 - aGrid.y));
  p.x *= (16.0 / 9.0) / uAspect;
  vX = p.x / p.w * 0.5 + 0.5;
  gl_Position = p;
}`;

export const WAVE_FS = `#version 300 es
precision highp float;
centroid in float vT;
centroid in float vK;
centroid in float vFade;
out vec4 oColor;
uniform sampler2D uFresLut;
uniform float uFresnel;
uniform float uBrightness;
uniform float uGain;
centroid in float vX;
uniform vec3 uHGrad0;
uniform vec3 uHGrad1;
void main() {
  float rim = texture(uFresLut, vec2(clamp(vT, 0.0, 1.0), 0.5)).r;
  float a = clamp((rim * uFresnel + uBrightness * 0.4980392157) * vK * vFade, 0.0, 0.5) * uGain;
  oColor = vec4(mix(uHGrad0, uHGrad1, clamp(vX, 0.0, 1.0)) * a, a);
}`;
