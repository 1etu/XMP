export const PART_WGSL = `
struct Part {
  view : vec4f,
};
@group(0) @binding(0) var<uniform> u : Part;
@group(0) @binding(1) var<storage, read> particles : array<vec4f>;
struct Vo {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
  @location(1) light : vec3f,
  @location(2) focus : vec2f,
  @location(3) @interpolate(flat) halo : u32,
};
@vertex
fn vs(@builtin(vertex_index) vi : u32, @builtin(instance_index) ii : u32) -> Vo {
  var corners = array<vec2f, 4>(vec2f(-1.0,-1.0),vec2f(1.0,-1.0),vec2f(-1.0,1.0),vec2f(1.0,1.0));
  let i = (ii / 2u) * 4u;
  let center = particles[i];
  let axes = particles[i + 1u];
  let light = particles[i + 2u];
  let halo = particles[i + 3u];
  let c = corners[vi];
  var offset = axes.xy * c.x + axes.zw * c.y;
  var o : Vo;
  o.halo = ii % 2u;
  if (o.halo == 1u) { offset = c * light.w * halo.w / vec2f(16.0 / 9.0, 1.0); }
  var p = center.xy + offset;
  p.x *= (16.0 / 9.0) / u.view.x;
  o.pos = vec4f(p, 0.0, 1.0);
  o.uv = c;
  o.light = select(light.rgb, halo.rgb, o.halo == 1u);
  o.focus = center.zw;
  return o;
}
@fragment
fn fs(v : Vo) -> @location(0) vec4f {
  let r = length(v.uv);
  var profile : f32;
  if (v.halo == 1u) {
    profile = exp(-u.view.z * pow(min(r, 1.0), u.view.y)) * (1.0 - smoothstep(0.85, 1.0, r));
  } else {
    let edge = 0.05 + 0.6345 * v.focus.x;
    let disk = 1.0 - smoothstep(0.5 - edge, 0.5 + edge, r);
    profile = mix(disk, 1.0 - exp(-disk * v.focus.y), v.focus.x);
  }
  return vec4f(v.light * profile, 0.0);
}
`;
