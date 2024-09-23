export const BG_WGSL = `
struct Bg {
  c0 : vec4f,
  c1 : vec4f,
  c2 : vec4f,
  c3 : vec4f,
  tone : vec4f,
};

@group(0) @binding(0) var<uniform> u : Bg;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var pal : texture_2d<f32>;

struct Vo {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i : u32) -> Vo {
  var p = array<vec2f, 4>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, 1.0)
  );
  var o : Vo;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = p[i] * 0.5 + 0.5;
  return o;
}

@fragment
fn fs(v : Vo) -> @location(0) vec4f {
  let vgrad = mix(u.c0.rgb, u.c1.rgb, v.uv.y);
  let c = textureSample(pal, samp, vec2f(v.uv.x, 1.0 - v.uv.y)).rgb;
  let bias = mix(max(u.tone.x, 0.85), 1.0, u.tone.y);
  return vec4f(c * vgrad * bias * 0.6, 1.0);
}
`;
