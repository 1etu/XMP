export const POST_WGSL = `
struct Post {
  a : vec4f,
  b : vec4f,
  c : vec4f,
  weights : array<vec4f, 8>,
};

@group(0) @binding(0) var<uniform> u : Post;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var src : texture_2d<f32>;
@group(0) @binding(3) var aux : texture_2d<f32>;
@group(0) @binding(4) var exposureLut : texture_2d<f32>;
@group(0) @binding(5) var particles : texture_2d<f32>;

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
  o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5);
  return o;
}

@fragment
fn copy(v : Vo) -> @location(0) vec4f {
  let d = 0.5 / vec2f(textureDimensions(src));
  var c = textureSample(src, samp, v.uv) * 0.5;
  c += textureSample(src, samp, v.uv + d) * 0.125;
  c += textureSample(src, samp, v.uv - d) * 0.125;
  c += textureSample(src, samp, v.uv + vec2f(d.x, -d.y)) * 0.125;
  c += textureSample(src, samp, v.uv + vec2f(-d.x, d.y)) * 0.125;
  if (u.a.y > 0.0) {
    c = vec4f(c.r, max(0.0, c.r * u.a.w - u.a.y), c.r * u.a.z, c.a);
  }
  return c * u.a.x;
}

fn dither(position : vec4f) -> f32 {
  let pixel = vec2u(position.xy);
  var seed = (pixel.x & 31u) | ((pixel.y & 31u) << 5u);
  seed = seed * 1664525u + 1013904223u;
  seed = seed ^ (seed >> 16u);
  return f32(seed & 7u) / 2040.0;
}

fn value(i : i32, channel : u32) -> f32 {
  return textureLoad(exposureLut, vec2i(min(i, 127), 0), 0)[channel];
}

@fragment
fn expose(v : Vo) -> @location(0) vec4f {
  let c = textureSample(src, samp, v.uv).rgb;
  if (u.a.x < 0.5 || u.a.y < 0.5) { return vec4f(c, 0.0); }
  let q = clamp(c * 8.0 - 0.5, vec3f(0.0), vec3f(127.0));
  let lo = vec3i(floor(q));
  let f = fract(q);
  let display = vec3f(
    mix(value(lo.r, 0u), value(lo.r + 1, 0u), f.r),
    mix(value(lo.g, 0u), value(lo.g + 1, 0u), f.g),
    mix(value(lo.b, 0u), value(lo.b + 1, 0u), f.b));
  let m = max(q.r, q.g);
  let j = i32(floor(m));
  let mask = mix(
    mix(value(max(lo.b, j), 1u), value(max(lo.b + 1, j), 1u), f.b),
    mix(value(max(lo.b, j + 1), 1u), value(max(lo.b + 1, j + 1), 1u), f.b), fract(m));
  return clamp(vec4f(display + dither(v.pos), mask), vec4f(0.0), vec4f(1.0));
}

@fragment
fn glare(v : Vo) -> @location(0) vec4f {
  let c = textureSample(src, samp, v.uv);
  return vec4f(c.rgb * select(1.0, c.a * 8.0, u.a.x > 0.5), 1.0);
}

@fragment
fn blur(v : Vo) -> @location(0) vec4f {
  var sum = textureSample(src, samp, v.uv).rgb * u.weights[0].rgb;
  for (var i = 1; i < 8; i += 1) {
    let d = u.a.xy * f32(i);
    sum += (textureSample(src, samp, v.uv + d).rgb + textureSample(src, samp, v.uv - d).rgb) * u.weights[i].rgb;
  }
  return vec4f(sum, 1.0);
}

@fragment
fn accumulate(v : Vo) -> @location(0) vec4f {
  return vec4f(textureSample(src, samp, v.uv).rgb * u.a.x, 0.0);
}

@fragment
fn composite(v : Vo) -> @location(0) vec4f {
  var scene = textureSample(src, samp, v.uv).rgb;
  let glare = textureSample(aux, samp, v.uv).rgb;
  if (u.b.y > 0.5 && u.b.x > 0.5) { scene -= dither(v.pos); }
  if (u.b.y > 0.5 && u.b.x < 0.5) {
    let c = scene * u.a.x;
    scene = c * (1.0 + c / max(u.a.y * u.a.y, 0.000001)) / (1.0 + c);
  }
  let display = clamp(mix(scene + glare, glare, u.a.w), vec3f(0.0), vec3f(1.0));
  return vec4f(clamp(display + textureSample(particles, samp, v.uv).rgb, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
