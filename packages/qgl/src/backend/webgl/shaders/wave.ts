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
