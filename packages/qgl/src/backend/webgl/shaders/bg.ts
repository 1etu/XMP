export const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform vec3 uCorner0;
uniform vec3 uCorner1;
uniform vec3 uCorner2;
uniform vec3 uCorner3;
uniform sampler2D uPal;
uniform float uNightWhitBias;
uniform float uDaylight;
void main() {
  vec3 vgrad = mix(uCorner0, uCorner1, vUv.y);
  vec3 pal = texture(uPal, vec2(vUv.x, 1.0 - vUv.y)).rgb;
  float bias = mix(max(uNightWhitBias, 0.85), 1.0, uDaylight);
  oColor = vec4(pal * vgrad * bias * 0.6, 1.0);
}`;
