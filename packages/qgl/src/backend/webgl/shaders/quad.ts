export const FULLSCREEN_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const COPY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uSrc;
uniform vec3 uTransfer;
void main() {
  vec2 d = 0.5 / vec2(textureSize(uSrc, 0));
  vec4 c = texture(uSrc, vUv) * 0.5;
  c += texture(uSrc, vUv + d) * 0.125;
  c += texture(uSrc, vUv - d) * 0.125;
  c += texture(uSrc, vUv + vec2(d.x, -d.y)) * 0.125;
  c += texture(uSrc, vUv + vec2(-d.x, d.y)) * 0.125;
  if (uTransfer.x > 0.0) {
    c.rgb = vec3(c.r, max(0.0, c.r * uTransfer.z - uTransfer.x), c.r * uTransfer.y);
  }
  oColor = c;
}`;
