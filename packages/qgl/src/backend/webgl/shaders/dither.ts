export const DITHER_GLSL = `
float dither(ivec2 dimensions) {
  uvec2 pixel = uvec2(gl_FragCoord.x, float(dimensions.y) - gl_FragCoord.y);
  uint seed = (pixel.x & 31u) | ((pixel.y & 31u) << 5u);
  seed = seed * 1664525u + 1013904223u;
  seed = seed ^ (seed >> 16u);
  return float(seed & 7u) / 2040.0;
}`;
