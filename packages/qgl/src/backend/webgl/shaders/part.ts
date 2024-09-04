export const PART_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uParticles;
uniform float uAspect;
out vec2 vUv;
out vec3 vLight;
out vec2 vFocus;
flat out int vHalo;
void main() {
  int i = gl_InstanceID / 2;
  vHalo = gl_InstanceID % 2;
  vec4 center = texelFetch(uParticles, ivec2(0, i), 0);
  vec4 axes = texelFetch(uParticles, ivec2(1, i), 0);
  vec4 light = texelFetch(uParticles, ivec2(2, i), 0);
  vec4 halo = texelFetch(uParticles, ivec2(3, i), 0);
  vec2 corners[4] = vec2[4](vec2(-1.0,-1.0),vec2(1.0,-1.0),vec2(-1.0,1.0),vec2(1.0,1.0));
  vec2 c = corners[gl_VertexID];
  vec2 offset = axes.xy * c.x + axes.zw * c.y;
  if (vHalo == 1) offset = c * light.w * halo.w / vec2(16.0 / 9.0, 1.0);
  vec2 p = center.xy + offset;
  p.x *= (16.0 / 9.0) / uAspect;
  gl_Position = vec4(p, 0.0, 1.0);
  vUv = c;
  vLight = vHalo == 1 ? halo.rgb : light.rgb;
  vFocus = center.zw;
}`;

export const PART_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vLight;
in vec2 vFocus;
flat in int vHalo;
uniform vec2 uGlarePower;
out vec4 oColor;
void main() {
  float r = length(vUv);
  float profile;
  if (vHalo == 1) {
    profile = exp(-uGlarePower.y * pow(min(r, 1.0), uGlarePower.x)) * (1.0 - smoothstep(0.85, 1.0, r));
  } else {
    float edge = 0.05 + 0.6345 * vFocus.x;
    float disk = 1.0 - smoothstep(0.5 - edge, 0.5 + edge, r);
    profile = mix(disk, 1.0 - exp(-disk * vFocus.y), vFocus.x);
  }
  oColor = vec4(vLight * profile, 0.0);
}`;
