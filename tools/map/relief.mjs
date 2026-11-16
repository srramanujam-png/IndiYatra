// tools/map/relief.mjs — ONE shaded 3-D relief image per mountain range (replaces the scattered cone "peaks").
//
// For a range polygon (SVG path in map units) we build a smooth height field (blurred polygon mask = a broad
// dome, plus ridged noise stretched ALONG the range so the ridges run parallel to it), light it from the
// north-west (hillshade), tint it by elevation (green foothills -> rock -> snow) and add a soft cast shadow.
// The result is a transparent RGBA tile that is composited on the plate, so the Himalaya reads as a single raised
// mass instead of hundreds of separate triangles. Deterministic (seeded), cached per feature.
import sharp from "sharp";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];

// Per-style colour ramps: shadow side, lit side, and (for snow) the cap colours.
export const RELIEF_STYLE = {
  snow:   { low: hex("#BCC5A4"), rockShade: hex("#74879A"), rockLit: hex("#C9D3DC"), snowShade: hex("#AFC2D6"), snowLit: hex("#FFFFFF"), snowAt: 0.62, foot: 0.3 },
  grassy: { low: hex("#B9BE8C"), rockShade: hex("#586338"), rockLit: hex("#D9DBA6"), snowAt: 9, foot: 0 },
  dry:    { low: hex("#E2CC98"), rockShade: hex("#7E5F33"), rockLit: hex("#F0DDAE"), snowAt: 9, foot: 0 },
  mixed:  { low: hex("#C9C896"), rockShade: hex("#6A6A3E"), rockLit: hex("#E0DFB0"), snowAt: 9, foot: 0 },
};

// seeded value noise
function makeNoise(seed) {
  const N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  let s = seed >>> 0; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = rnd(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i];
  const at = (x, y) => val[perm[(perm[x & 255] + y) & 511]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
  };
}

const bboxOf = (d) => {
  const n = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
  return { x0, y0, x1, y1 };
};

async function blurred(mask, w, h, sigmaPx) {
  const src = Buffer.from(mask.buffer, mask.byteOffset, mask.byteLength);       // mask is Uint8 0/255
  const out = await sharp(src, { raw: { width: w, height: h, channels: 1 } }).blur(Math.max(0.3, sigmaPx)).extractChannel(0).raw().toBuffer();
  const f = new Float32Array(w * h); for (let i = 0; i < f.length; i++) f[i] = out[i] / 255; return f;
}


// exact Euclidean distance (in pixels) from every INSIDE pixel to the nearest outside pixel (Felzenszwalb & Huttenlocher)
function edt(mask, w, h) {
  const INF = 1e20, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const g = new Float64Array(w * h); for (let i = 0; i < g.length; i++) g[i] = mask[i] > 127 ? INF : 0;
  const pass = (n, get, set) => {
    for (let q = 0; q < n; q++) f[q] = get(q);
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let sp = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (sp <= z[k]) { k--; sp = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = sp; z[k + 1] = INF;
    }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; set(q, d[q]); }
  };
  for (let x = 0; x < w; x++) pass(h, (q) => g[q * w + x], (q, val) => { g[q * w + x] = val; });
  for (let y = 0; y < h; y++) pass(w, (q) => g[y * w + q], (q, val) => { g[y * w + q] = val; });
  const out = new Float32Array(w * h); for (let i = 0; i < out.length; i++) out[i] = g[i] >= INF / 2 ? 0 : Math.sqrt(g[i]); return out;
}

/** Returns { png, x, y, w, h } (map units) or null. `scale` = output pixels per map unit. */
export async function reliefTile({ id, d, style = "mixed", scale = 2, seed = 1 }) {
  const bb = bboxOf(d); if (!(bb.x1 > bb.x0)) return null;
  const PAD = 20;
  const x0 = Math.floor(bb.x0 - PAD), y0 = Math.floor(bb.y0 - PAD), x1 = Math.ceil(bb.x1 + PAD), y1 = Math.ceil(bb.y1 + PAD);
  const w = Math.round((x1 - x0) * scale), h = Math.round((y1 - y0) * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#000"/><path d="${d}" fill="#fff" fill-rule="evenodd"/></svg>`;
  let mask = await sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();     // 0..255
  const n = w * h;
  // principal axis of the range (for ridge direction) + mean width
  let sx = 0, sy = 0, cnt = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (mask[y * w + x] > 127) { sx += x; sy += y; cnt++; }
  if (cnt < 20) return null;
  const mx = sx / cnt, my = sy / cnt; let cxx = 0, cyy = 0, cxy = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (mask[y * w + x] > 127) { const a = x - mx, b = y - my; cxx += a * a; cyy += b * b; cxy += a * b; }
  const ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy), ca = Math.cos(ang), sa = Math.sin(ang);
  const areaU = (cnt * 4) / (scale * scale);
  const lam1 = ((cxx + cyy) / 2 + Math.hypot((cxx - cyy) / 2, cxy)) / cnt;
  const majorU = Math.sqrt(lam1) * 3.46 / scale;                                   // rough length of the range (uniform-rod approximation)
  const widthU = Math.max(4, areaU / Math.max(majorU, 1));                         // rough mean width

  // thin / fragmented ranges (Ghats, Aravalli, Vindhya ...): dilate + close the footprint so they read as a MASS, not scattered specks.
  // The lawn clears the same footprint (drawMap.buildLawn uses `grow`), so the two always agree.
  const grow = +clamp(6 - widthU * 0.25, 0, 5).toFixed(1);
  if (grow > 0.3) {
    const bl = await blurred(mask, w, h, (grow * scale) / 1.17);
    const m2 = new Uint8Array(n); for (let i = 0; i < n; i++) m2[i] = bl[i] > 0.12 || mask[i] > 127 ? 255 : 0;
    mask = m2;
  }
  // crest profile from the true distance to the range edge: highest along the centre line, falling to the foot at the edge
  const dist = edt(mask, w, h), halfW = Math.max(2.5, widthU * 0.5) * scale;
  let mxh = 1; const dome = new Float32Array(n);
  for (let i = 0; i < n; i++) dome[i] = clamp(dist[i] / (halfW * 0.95));
  { const sm = await blurred(Uint8Array.from(dome, (v) => Math.round(v * 255)), w, h, 1.6 * scale); for (let i = 0; i < n; i++) dome[i] = sm[i]; }   // soften distance-transform facets
  if (process.env.RELIEF_DEBUG) console.log(id, 'widthU', widthU.toFixed(1), 'lengthU', majorU.toFixed(0));
  // ridged noise stretched along the range axis
  const nz = makeNoise(seed * 7919 + 13);
  const ridgeU = clamp(widthU * 0.17, 3.6, 8);                                     // ridge spacing across the range (map units)
  const elev = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, dm = dome[i] / mxh; if (dm < 0.001) continue;
    let u = ((x - mx) * ca + (y - my) * sa) / scale, v = (-(x - mx) * sa + (y - my) * ca) / scale;   // along / across
    const wu = (nz(u * 0.045 + 3.1, v * 0.045 + 7.7) - 0.5) * 2 * ridgeU * 1.1, wv = (nz(u * 0.05 + 11.3, v * 0.05 + 1.9) - 0.5) * 2 * ridgeU * 0.9; u += wu; v += wv;   // domain warp: ridges meander instead of running ruler-straight
    let r = 0, amp = 1, tot = 0, fu = 1 / (ridgeU * 2.6), fv = 1 / ridgeU;
    for (let o = 0; o < 3; o++) { const nv = nz(u * fu + o * 17.3, v * fv + o * 9.1); r += (1 - Math.abs(2 * nv - 1)) * amp; tot += amp; amp *= 0.42; fu *= 2.2; fv *= 2.2; }
    r /= tot;
    elev[i] = clamp(Math.pow(dm, 0.7) * (0.30 + 0.95 * r), 0, 1.3);
  }
  // soft polygon edge alpha + cast shadow (mask shifted south-east)
  const edge = await blurred(mask, w, h, 0.9 * scale);
  const sh = new Uint8Array(n), off = Math.round(3 * scale);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const xs = x - off, ys = y - off; sh[y * w + x] = xs >= 0 && ys >= 0 && mask[ys * w + xs] > 127 ? 255 : 0; }
  const shadow = await blurred(sh, w, h, 1.6 * scale);

  const st = RELIEF_STYLE[style] || RELIEF_STYLE.mixed;
  const L = (() => { const a = (-45 * Math.PI) / 180, alt = (38 * Math.PI) / 180; const lx = Math.cos(a) * Math.cos(alt), ly = Math.sin(a) * Math.cos(alt), lz = Math.sin(alt); return [lx, ly, lz]; })();
  // light comes from the north-west (screen top-left): direction TO light = (-,-,+)
  const Ld = [-0.55, -0.62, 0.56], Ll = Math.hypot(...Ld); Ld[0] /= Ll; Ld[1] /= Ll; Ld[2] /= Ll; void L;
  const Zx = 8 * scale;                                                         // vertical exaggeration
  const out = Buffer.alloc(n * 4);
  const flat = Ld[2];
  const at = (x, y) => elev[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, e = elev[i];
    const a = clamp((edge[i] - 0.3) / 0.4);                                       // 0 outside .. 1 inside
    const sa2 = shadow[i] * 0.2;
    if (a <= 0 && sa2 < 0.004) continue;
    const dzdx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * Zx, dzdy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * Zx;
    const nl = Math.hypot(dzdx, dzdy, 1), nn = [-dzdx / nl, -dzdy / nl, 1 / nl];
    const lit = clamp(0.5 + (nn[0] * Ld[0] + nn[1] * Ld[1] + nn[2] * Ld[2] - flat) * 2.2);   // 0.5 on flat ground
    let col = mix(st.rockShade, st.rockLit, lit);
    col = mix(mix(st.low, col, 0.25), col, smooth(0.02, 0.2 + st.foot * 0.2, e));             // low ground tinted with the base colour
    if (st.snowAt < 5) {
      const jitter = (nz(x / scale * 0.55, y / scale * 0.55) - 0.5) * 0.16;
      const sn = smooth(st.snowAt - 0.06, st.snowAt + 0.1, e + jitter + (lit - 0.5) * 0.08);
      col = mix(col, mix(st.snowShade, st.snowLit, lit), sn);
    }
    const ao = 1 - 0.18 * (1 - smooth(0, 0.35, e));                               // slight darkening in the valleys
    col = [col[0] * ao, col[1] * ao, col[2] * ao];
    // compose with cast shadow beneath (non-premultiplied)
    const sA = clamp(sa2) * (1 - a), oA = a + sA;
    const j = i * 4;
    out[j]     = Math.round((col[0] * a + 50 * sA) / oA);
    out[j + 1] = Math.round((col[1] * a + 62 * sA) / oA);
    out[j + 2] = Math.round((col[2] * a + 50 * sA) / oA);
    out[j + 3] = Math.round(oA * 255);
  }
  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  return { png, x: x0, y: y0, w: x1 - x0, h: y1 - y0, id, grow };
}
