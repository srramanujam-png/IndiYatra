// src/lib/map/drawMap.js
// Canvas renderer for the India progress map. One coordinate system everywhere: MAP UNITS
// (0..frame.W × 0..frame.H, 1000 wide). The same transform serves the pre-rendered plate, the
// dynamic layer, hit regions and labels, so nothing drifts on resize.
//
// quick view : plate <img> (terrain + 3-D mountains) + THIS canvas draws the live layers, bottom → top:
//                 turf lawn (cached, spreads south → north) · rivers (animated) · temples · plants (animated) · mala
// detail    : same live layers on top of the vector geography (lazy-loaded geo.json) with pan/zoom
import { growthCount, hash01, malaEarned } from "./mapMath";

export const SPRITE_UNITS = { seed: 9, grass: 21, plant: 52 };   // drawn width in map units (× rule scale for plants)

/** Prepare the canvas for a CSS size + devicePixelRatio; returns the CSS→canvas scale. */
export function sizeCanvas(canvas, cssW, cssH, dpr = 1) {
  const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return dpr;
}

const TAU = Math.PI * 2;
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// ─── turf lawn ─────────────────────────────────────────────────────────────────────────────────────
// One uniform green that spreads south → north with progress. Built ONCE per (progress, size, unlocked features) into an
// offscreen canvas; the live loop only blits it. It leaves clear gaps around rivers and unlocked mountain ranges.
export const LAWN_GREEN = "#6BAE45";
const bladeTiles = new Map();
// Blade texture tile drawn at DEVICE resolution (s = canvas px per map unit) so the fine blades stay crisp instead of being up-scaled.
function blades(s = 1) {
  const key = Math.max(1, Math.min(4, Math.round(s * 2) / 2)), hit = bladeTiles.get(key); if (hit) return { tile: hit, s: key };
  const px = Math.round(72 * key);
  const t = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(px, px) : Object.assign(document.createElement("canvas"), { width: px, height: px });
  const x = t.getContext("2d"); x.scale(px / 72, px / 72);
  for (let i = 0; i < 520; i++) {                          // fine, single-hue blade flecks: texture without banding or patches
    x.strokeStyle = hash01(i, 5) > 0.5 ? "rgba(70,140,50,.34)" : "rgba(140,200,100,.34)"; x.lineWidth = 0.6;
    const bx = hash01(i, 11) * 72, by = hash01(i, 12) * 72, h = 2.5 + hash01(i, 13) * 3.5, lean = (hash01(i, 14) - 0.5) * 2;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + lean, by - h); x.stroke();
  }
  bladeTiles.set(key, t); return { tile: t, s: key };
}
const ringPath = (ctx, f, close) => { ctx.beginPath(); for (let i = 0; i < f.length; i += 2) (i ? ctx.lineTo(f[i], f[i + 1]) : ctx.moveTo(f[i], f[i + 1])); if (close) ctx.closePath(); };

/** Metaball-style edge: blur the blob coverage, then re-threshold its alpha so the lawn boundary is one smooth curve
 *  (no scalloped round lobes) while the interior stays fully opaque. `s` = canvas px per map unit. */
function smoothEdge(c, s) {
  const mk = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
  const t = mk(c.width, c.height), tx = t.getContext("2d");
  if (!("filter" in tx)) return;                                  // very old browser: keep the feathered edge
  tx.filter = `blur(${(5 * s).toFixed(1)}px)`; tx.drawImage(c, 0, 0);
  const img = tx.getImageData(0, 0, t.width, t.height), d = img.data, lo = 0.42 * 255, hi = 0.58 * 255;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; d[i] = a <= lo ? 0 : a >= hi ? 255 : Math.round(((a - lo) / (hi - lo)) * 255); }
  tx.putImageData(img, 0, 0);
  const x = c.getContext("2d"); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "copy"; x.drawImage(t, 0, 0); x.restore();
}

export function buildLawn({ growth, unit = 0.1, progress, indiaD, hotspots, unlocked, W, H, widthPx }) {
  const total = growth.length / 2, n = growthCount(progress, total);
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(widthPx, Math.round((widthPx * H) / W)) : Object.assign(document.createElement("canvas"), { width: widthPx, height: Math.round((widthPx * H) / W) });
  const x = c.getContext("2d"); x.setTransform(widthPx / W, 0, 0, widthPx / W, 0, 0);
  if (n <= 0) return c;
  const R = 26;
  for (let i = 0; i < n; i++) {                            // soft blobs: interior saturates to a uniform colour, edge feathers
    const cx = growth[i * 2] * unit, cy = growth[i * 2 + 1] * unit;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, LAWN_GREEN); g.addColorStop(0.8, LAWN_GREEN); g.addColorStop(1, "rgba(107,174,69,0)");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
  }
  smoothEdge(c, widthPx / W);
  x.globalCompositeOperation = "source-atop"; x.globalAlpha = 0.55; const bt = blades(widthPx / W), pat = x.createPattern(bt.tile, "repeat"); pat.setTransform(new DOMMatrix().scale(1 / bt.s)); x.fillStyle = pat; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  if (indiaD) { x.globalCompositeOperation = "destination-in"; x.fillStyle = "#000"; x.fill(new Path2D(indiaD), "evenodd"); }
  x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000"; x.strokeStyle = "#000"; x.lineCap = x.lineJoin = "round";
  for (const id of unlocked || []) {
    const h = hotspots?.[id]; if (!h?.parts) continue;
    if (h.type === "river") for (const [w, a] of [[17, 0.35], [11, 1]]) { x.lineWidth = w; x.globalAlpha = a; for (const f of h.parts) { ringPath(x, f, false); x.stroke(); } }
    else if (h.type === "mountain") { x.lineWidth = 7; x.globalAlpha = 0.45; for (const f of h.parts) { ringPath(x, f, true); x.stroke(); } x.globalAlpha = 1; for (const f of h.parts) { ringPath(x, f, true); x.fill(); } }
  }
  x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
  return c;
}

// ─── rivers (bank + water + moving shimmer; optional draw-in from source to mouth) ───────────────────
const lenCache = new WeakMap();
function partLen(f) { let L = lenCache.get(f); if (L == null) { L = 0; for (let i = 2; i < f.length; i += 2) L += Math.hypot(f[i] - f[i - 2], f[i + 1] - f[i - 1]); lenCache.set(f, L); } return L; }
export function drawRivers(ctx, { hotspots, unlocked, t = 0, reveal = {}, k = 1, still = false }) {
  ctx.lineCap = ctx.lineJoin = "round";
  const s = 1 / Math.sqrt(k);
  for (const id of unlocked || []) {
    const h = hotspots?.[id]; if (!h || h.type !== "river" || !h.parts) continue;
    const p = reveal[id] == null ? 1 : reveal[id]; if (p <= 0) continue;
    const stroke = (w, style, dash, off) => {
      ctx.lineWidth = w * s; ctx.strokeStyle = style;
      for (const f of h.parts) {
        const L = partLen(f);
        ctx.setLineDash(dash ? dash : p < 1 ? [L * p, L + 1] : []); ctx.lineDashOffset = off || 0;
        ringPath(ctx, f, false); ctx.stroke();
      }
    };
    stroke(6.5, "rgba(255,255,255,.75)"); stroke(2.6, "#2F7DBE");
    if (p >= 1 && !still) stroke(1.4, "rgba(214,238,252,.95)", [5 * s, 24 * s], -t * 22 * s);   // shimmer travels downstream
    ctx.setLineDash([]);
  }
}

// ─── temples ─────────────────────────────────────────────────────────────────────────────────────────
export function drawTemples(ctx, { hotspots, unlocked, t = 0, k = 1, still = false }) {
  const s = 1 / Math.sqrt(k);
  for (const id of unlocked || []) {
    const h = hotspots?.[id]; if (!h || h.type !== "temple") continue;
    ctx.save(); ctx.translate(h.anchor[0], h.anchor[1]); ctx.scale(1.5 * s, 1.5 * s);
    ctx.shadowColor = "rgba(255,142,0,.7)"; ctx.shadowBlur = still ? 8 : 8 + 5 * Math.sin(t * 2 + h.anchor[0]);
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(6, 6); ctx.lineTo(6, 2); ctx.lineTo(4, 2); ctx.lineTo(0, -6); ctx.lineTo(-4, 2); ctx.lineTo(-6, 2); ctx.closePath();
    ctx.fillStyle = "#FF8E00"; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 1.4; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.restore();
  }
}

// ─── plants: pale pad so they read on the lawn; pop-in when newly earned; gentle sway ────────────────
export function drawPlants(ctx, { atlas, sprites, plants, t = 0, born = {}, still = false }) {
  const cell = sprites.cell; let drawn = 0;
  for (const p of plants || []) {
    const at = sprites.keys[p.key]; if (!at) continue;
    let sc = 1;
    const b0 = born[`${p.key}:${p.n}`];
    if (b0 != null) { const a = (t - b0) / 0.7; if (a < 0) continue; sc = a >= 1 ? 1 : Math.max(0.001, easeOutBack(a)); }
    const size = SPRITE_UNITS.plant * p.scale * sc;
    ctx.fillStyle = "rgba(255,255,255,.42)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - size * 0.02, size * 0.34, size * 0.13, 0, 0, TAU); ctx.fill();
    const lotus = p.key === "lotus";
    const sway = still || lotus ? 0 : Math.sin(t * 1.4 + p.n * 1.7) * 0.035;
    const bob = still || !lotus ? 0 : Math.sin(t * 1.6 + p.n) * 0.6;
    ctx.save(); ctx.translate(p.x, p.y + bob); if (sway) ctx.rotate(sway);
    if (hash01(p.n, 21) > 0.5) ctx.scale(-1, 1);
    ctx.drawImage(atlas, at[0], at[1], cell, cell, -size / 2, -size * 0.9, size, size); ctx.restore(); drawn++;
  }
  return drawn;
}

// ─── rudraksha mala on the boundary: small ridged beads, grey → brown, filling to the exact progress % ─
export const MALA_BEAD_UNITS = 6.8;         // bead length in map units
const beadCache = new Map();
function beadSprite(earned) {
  const key = earned ? "on" : "off";
  if (beadCache.has(key)) return beadCache.get(key);
  const S = 40, c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(S, S) : Object.assign(document.createElement("canvas"), { width: S, height: S });
  const x = c.getContext("2d"), r = 14;
  const tone = earned ? ["#CDA67E", "#98724E", "#6C4A2F"] : ["#EFEFEC", "#D3D3CE", "#B6B6B1"];
  const shape = () => { x.beginPath(); for (let i = 0; i <= 30; i++) { const a = (i / 30) * TAU, rr = r * (1 + 0.09 * Math.sin(5 * a + 1.3)); const px = S / 2 + rr * Math.cos(a) * 1.12, py = S / 2 + rr * Math.sin(a) * 0.96; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  const g = x.createRadialGradient(S / 2 - r * 0.3, S / 2 - r * 0.3, r * 0.1, S / 2, S / 2, r * 1.15);
  g.addColorStop(0, tone[0]); g.addColorStop(0.6, tone[1]); g.addColorStop(1, tone[2]);
  shape(); x.fillStyle = g; x.fill();
  x.save(); shape(); x.clip(); x.strokeStyle = earned ? "rgba(70,40,20,.55)" : "rgba(110,110,105,.4)"; x.lineWidth = 1;   // mukhi ridges, bead-end to bead-end
  for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(S / 2 - r * 1.2, S / 2 + j * r * 0.42); x.quadraticCurveTo(S / 2, S / 2 + j * r * 0.85, S / 2 + r * 1.2, S / 2 + j * r * 0.42); x.stroke(); }
  x.restore(); beadCache.set(key, c); return c;
}

/** progress is 0..100. Bead b is earned when b+1 <= progress·n/100; the next bead fills partially. Order = Kashmir → clockwise → Kashmir. */
export function drawMala(ctx, { mala, unit = 0.1, progress, k = 1 }) {
  if (!mala?.pos?.length) return 0;
  const n = mala.beads, earned = malaEarned(progress, n), s = 1 / Math.sqrt(k);
  const sp = mala.string, pts = []; for (let i = 0; i < sp.length; i += 2) pts.push([sp[i] * unit, sp[i + 1] * unit]);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const upto = (earned / n) * (cum[cum.length - 1] || 1);
  ctx.lineCap = ctx.lineJoin = "round"; ctx.lineWidth = 0.7 * s;
  ctx.strokeStyle = "rgba(160,158,150,.5)"; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
  if (upto > 0) { ctx.strokeStyle = "rgba(139,98,62,.75)"; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length && cum[i] <= upto; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  const off = beadSprite(false), on = beadSprite(true), D = MALA_BEAD_UNITS * s * 1.35;   // sprite cell is larger than the bead body
  for (let b = 0; b < n; b++) {
    const x = mala.pos[b * 4], y = mala.pos[b * 4 + 1], a = Math.atan2(mala.pos[b * 4 + 3], mala.pos[b * 4 + 2]);
    const f = Math.max(0, Math.min(1, earned - b));
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.drawImage(f >= 1 ? on : off, -D / 2, -D / 2, D, D);
    if (f > 0 && f < 1) { ctx.beginPath(); ctx.rect(-D / 2, -D / 2, D * f, D); ctx.clip(); ctx.drawImage(on, -D / 2, -D / 2, D, D); }   // partial bead fills along the thread
    ctx.restore();
  }
  return n;
}

/** Whole live layer in the right order. `lawn` is the cached offscreen canvas from buildLawn (or null). */
export function paintScene(ctx, { lawn, frame, hotspots, unlocked, sprites, plants, mala, unit, progress, t = 0, reveal = {}, born = {}, k = 1, still = false }) {
  if (lawn) ctx.drawImage(lawn, 0, 0, frame.W, frame.H);
  drawRivers(ctx, { hotspots, unlocked, t, reveal, k, still });
  drawTemples(ctx, { hotspots, unlocked, t, k, still });
  const p = drawPlants(ctx, { atlas: sprites.atlas, sprites, plants, t, born, still });
  const b = drawMala(ctx, { mala, unit, progress, k });
  return p + b;
}
export { easeOutCubic };

// ─── vector geography (detail view only) ─────────────────────────────────────────────────────────────
const PALETTE = {
  sea: "#E7ECEE", land: "#F8F7F2", coast: "#D6D3C6", relief: "#ECE7D8", india: "#F0EDE3", indiaLine: "#00509E",
  river: "#3F86C3", riverSoft: "#8DBBE0", temple: "#FF8E00",
  snow: ["#DCE7EF", "#8FA9BF"], grassy: ["#BFD0A0", "#8AA06A"], dry: ["#E5D0A6", "#B9A06A"], mixed: ["#D2D3A8", "#9DA070"],
};

const pathCache = new WeakMap();
function pathsFor(geo) {
  let c = pathCache.get(geo);
  if (!c) {
    c = { land: new Path2D(geo.land), relief: new Path2D(geo.relief), outline: new Path2D(geo.outline.d), features: {} };
    for (const [id, f] of Object.entries(geo.features)) c.features[id] = new Path2D(f.d);
    pathCache.set(geo, c);
  }
  return c;
}

const PEAK = {
  snow: { lit: "#B7C6D3", dark: "#7F93A6", cap: "#FFFFFF", capDark: "#D5E1EB", ink: "#6C8093" },
  grassy: { lit: "#A9BE86", dark: "#71875A", ink: "#5F7449" }, dry: { lit: "#E0C994", dark: "#AD9358", ink: "#8F7841" }, mixed: { lit: "#C5C994", dark: "#8D935F", ink: "#767B4E" },
};
const tri = (ctx, ...p) => { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); };
/** 3-D peak: lit left face, shaded right face, cast shadow, snow cap (same recipe as tools/map/render-plates.mjs). */
export function drawPeaks(ctx, f) {
  const a = f.peaks; if (!a) return;
  const c = PEAK[f.style] || PEAK.mixed, snow = f.style === "snow";
  for (let i = 0; i < a.length; i += 3) {
    const x = a[i] / 10, y = a[i + 1] / 10, w = (snow ? 21 : 17) * (a[i + 2] / 100), h = w * (snow ? 1.18 : 0.9);
    const A = [x + 0.06 * w, y - h], L = [x - 0.5 * w, y], R = [x + 0.5 * w, y], M = [x + 0.1 * w, y + 0.07 * h];
    ctx.globalAlpha = 0.16; ctx.fillStyle = "#3b4a3a"; tri(ctx, R, [x + 0.5 * w + h * 0.55, y - 0.02 * h], [A[0] + h * 0.42, A[1] + h * 0.18]); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = c.lit; tri(ctx, L, A, M); ctx.fill(); ctx.fillStyle = c.dark; tri(ctx, A, R, M); ctx.fill();
    if (snow) {
      const t = 0.34, cl = [A[0] + (L[0] - A[0]) * t, A[1] + (L[1] - A[1]) * t], cr = [A[0] + (R[0] - A[0]) * t, A[1] + (R[1] - A[1]) * t], cm = [(cl[0] + cr[0]) / 2 + 0.03 * w, cl[1] + 0.09 * h];
      ctx.fillStyle = c.cap; tri(ctx, A, cl, cm, cr); ctx.fill(); ctx.fillStyle = c.capDark; tri(ctx, A, cm, cr); ctx.fill();
    }
  }
}

export function drawGeography(ctx, { geo, unlocked, k = 1 }) {
  const P = pathsFor(geo);
  ctx.fillStyle = PALETTE.sea; ctx.fillRect(0, 0, geo.frame.W, geo.frame.H);
  ctx.fillStyle = PALETTE.land; ctx.fill(P.land, "evenodd");
  ctx.lineWidth = 0.8 / k; ctx.strokeStyle = PALETTE.coast; ctx.stroke(P.land);
  ctx.globalAlpha = 0.5; ctx.fillStyle = PALETTE.relief; ctx.fill(P.relief, "evenodd"); ctx.globalAlpha = 1;
  const open = new Set(unlocked);
  for (const id of open) {
    const f = geo.features[id]; if (!f || f.type !== "mountain") continue;
    const [fill, line] = PALETTE[f.style] || PALETTE.mixed;
    ctx.globalAlpha = 0.55; ctx.fillStyle = fill; ctx.fill(P.features[id], "evenodd"); ctx.globalAlpha = 1;
    ctx.lineWidth = 1 / k; ctx.strokeStyle = line; ctx.lineJoin = "round"; ctx.stroke(P.features[id]);
    drawPeaks(ctx, f);
  }
  ctx.globalAlpha = 0.6; ctx.fillStyle = PALETTE.india; ctx.fill(P.outline, "evenodd"); ctx.globalAlpha = 1;
  ctx.lineWidth = 1 / k; ctx.strokeStyle = PALETTE.indiaLine; ctx.globalAlpha = 0.45; ctx.lineJoin = "round"; ctx.stroke(P.outline); ctx.globalAlpha = 1;
}

/** Zoom-dependent labels for revealed features (detail view). */
export function drawLabels(ctx, { hotspots, unlocked, k = 1, hover = null }) {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const size = 11 / Math.sqrt(k);
  ctx.font = `600 ${size}px 'Nunito Sans', system-ui, sans-serif`;
  for (const id of unlocked) {
    const h = hotspots[id]; if (!h) continue;
    const show = k >= 1.6 || id === hover;
    if (!show) continue;
    const [x, y] = h.anchor;
    ctx.lineWidth = 3 / Math.sqrt(k); ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.strokeText(h.name, x, y);
    ctx.fillStyle = h.type === "river" ? "#1F5F99" : h.type === "temple" ? "#B35F00" : "#4A5A2A"; ctx.fillText(h.name, x, y);
  }
}
