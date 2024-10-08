export const WAVE_WGSL = `
struct Wave {
  shade : vec4f,
  view : vec4f,
  tint0 : vec4f,
  tint1 : vec4f,
};
@group(0) @binding(0) var<uniform> u : Wave;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var<storage, read> spline : array<vec4f>;
@group(0) @binding(3) var fresLut : texture_2d<f32>;
@group(0) @binding(4) var<storage, read> normals : array<vec4f>;
struct Vo {
  @builtin(position) pos : vec4f,
  @location(0) @interpolate(perspective, centroid) t : f32,
  @location(1) @interpolate(perspective, centroid) k : f32,
  @location(2) @interpolate(perspective, centroid) fade : f32,
  @location(3) @interpolate(perspective, centroid) x : f32,
};
@vertex
fn vs(@builtin(vertex_index) vi : u32) -> Vo {
  let cell = vec2i(i32(vi % 128u), i32(vi / 128u));
  let g = vec2f(cell) / 127.0;
  var p = spline[vi];
  let nRaw = normals[vi].xyz;
  let n = nRaw / max(length(nRaw), 0.000001);
  let v = normalize(p.xyz);
  let k = u.shade.z * abs(dot(v, nRaw)) / length(p.xyz);
  var o : Vo;
  p.x *= (16.0 / 9.0) / u.view.y;
  o.pos = p;
  o.x = p.x / p.w * 0.5 + 0.5;
  o.t = abs(dot(n, v)) * k;
  o.k = k;
  o.fade = min(1.0, 10.0 * min(g.x, 1.0 - g.x))
    * min(1.0, 10.0 * min(g.y, 1.0 - g.y));
  return o;
}
@fragment
fn fs(v : Vo) -> @location(0) vec4f {
  let rim = textureSample(fresLut, samp, vec2f(clamp(v.t, 0.0, 1.0), 0.5)).r;
  let a = clamp((rim * u.shade.x + u.shade.y * 0.4980392157) * v.k * v.fade, 0.0, 0.5) * u.view.z;
  return vec4f(mix(u.tint0.rgb, u.tint1.rgb, clamp(v.x, 0.0, 1.0)) * a, a);
}
`;
