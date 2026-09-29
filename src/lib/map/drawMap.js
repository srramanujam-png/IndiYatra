// src/lib/map/drawMap.js
// Canvas renderer for the India progress map. One coordinate system everywhere: MAP UNITS
// (0..frame.W × 0..frame.H, 1000 wide). The same transform serves the pre-rendered plate, the
// dynamic layer, hit regions and labels, so nothing drifts on resize.
//
// quick view : plate <img> (from CDN) + THIS canvas draws only the dynamic vegetation
// detail    : this canvas also draws the vector geography (lazy-loaded geo.json) with pan/zoom
import { growthStates, hash01, malaEarned } from "./mapMath";

export const SPRITE_UNITS = { seed: 9, grass: 21, plant: 52 };   // drawn width in map units (× rule scale for plants)

/** Prepare the canvas for a CSS size + devicePixelRatio; returns the CSS→canvas scale. */
export function sizeCanvas(canvas, cssW, cssH, dpr = 1) {
  const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return dpr;
}

function place(ctx, atlas, sprites, key, x, y, size, flip = false) {
  const cell = sprites.cell, at = sprites.keys[key]; if (!at) return false;
  const bottom = 0.9;                                   // sprite base sits ~90% down its cell
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(atlas, at[0], at[1], cell, cell, -size / 2, y - size * bottom, size, size); ctx.restore(); }
  else ctx.drawImage(atlas, at[0], at[1], cell, cell, x - size / 2, y - size * bottom, size, size);
  return true;
}

/** Dynamic vegetation: dharma seeds → dhruva grass (south→north), then earned plants (exact counts). */
export function drawVegetation(ctx, { atlas, sprites, growth, unit = 0.1, progress, plants }) {
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const total = growth.length / 2;
  const { seeds, grass } = growthStates(progress, total);
  let drawn = 0;
  // grass first, painted north→south so southern tufts overlap northern ones
  const g = grass.slice().sort((a, b) => growth[a * 2 + 1] - growth[b * 2 + 1]);
  for (const i of g) {
    const x = growth[i * 2] * unit, y = growth[i * 2 + 1] * unit;
    const v = 1 + Math.floor(hash01(i, 3) * 3);
    const size = SPRITE_UNITS.grass * (0.85 + hash01(i, 5) * 0.4);
    if (place(ctx, atlas, sprites, `dhruva_grass_${v}`, x, y, size, hash01(i, 9) > 0.5)) drawn++;
  }
  for (const i of seeds) {
    if (place(ctx, atlas, sprites, "seed", growth[i * 2] * unit, growth[i * 2 + 1] * unit, SPRITE_UNITS.seed)) drawn++;
  }
  for (const p of plants || []) {
    if (place(ctx, atlas, sprites, p.key, p.x, p.y, SPRITE_UNITS.plant * p.scale, hash01(p.n, 21) > 0.5)) drawn++;
  }
  return drawn;   // instances painted (used by tests/perf logging)
}

// ─── rudraksha mala: 108 beads on the India boundary, grey until earned, filling to the EXACT progress % ───
export const MALA_BEAD_UNITS = 27;      // bead diameter in map units
const beadCache = new Map();
function beadSprite(earned) {
  const key = earned ? "on" : "off";
  if (beadCache.has(key)) return beadCache.get(key);
  const S = 72, c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(S, S) : Object.assign(document.createElement("canvas"), { width: S, height: S });
  const x = c.getContext("2d"), r = S / 2 - 3;
  const tone = earned ? ["#C58A4E", "#7A4522", "#3E2210", "#2B170A"] : ["#EDEDEA", "#C4C4BF", "#9C9C97", "#7F7F7A"];
  const g = x.createRadialGradient(S * 0.4, S * 0.36, r * 0.1, S / 2, S / 2, r);
  g.addColorStop(0, tone[0]); g.addColorStop(0.5, tone[1]); g.addColorStop(0.9, tone[2]); g.addColorStop(1, tone[3]);
  x.beginPath(); x.arc(S / 2, S / 2, r, 0, Math.PI * 2); x.fillStyle = g; x.fill();
  // the ridged "mukhi" lines that make a rudraksha read as a rudraksha
  x.save(); x.beginPath(); x.arc(S / 2, S / 2, r - 1, 0, Math.PI * 2); x.clip();
  x.strokeStyle = earned ? "rgba(35,18,6,.55)" : "rgba(90,90,86,.45)"; x.lineWidth = 2; x.lineCap = "round";
  for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(S / 2 + i * 1.5, 4); x.quadraticCurveTo(S / 2 + i * 15, S / 2, S / 2 + i * 1.5, S - 4); x.stroke(); }
  x.restore();
  x.beginPath(); x.arc(S / 2, 8, 2.6, 0, Math.PI * 2); x.fillStyle = earned ? "#1c0e05" : "#6c6c68"; x.fill();   // string hole
  x.beginPath(); x.arc(S * 0.36, S * 0.3, r * 0.22, 0, Math.PI * 2); x.fillStyle = "rgba(255,255,255,.28)"; x.fill();   // highlight
  beadCache.set(key, c); return c;
}

/** progress is 0..100. Bead k is fully earned when k+1 <= progress*108/100; the next bead fills partially. */
export function drawMala(ctx, { mala, unit = 0.1, progress, k = 1 }) {
  if (!mala?.pos?.length) return;
  const n = mala.beads, earned = malaEarned(progress, n);
  // thread: grey for the whole loop, brown for the earned fraction of its length
  const sp = mala.string, pts = []; for (let i = 0; i < sp.length; i += 2) pts.push([sp[i] * unit, sp[i + 1] * unit]);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1] || 1, upto = (earned / n) * total;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2 / Math.sqrt(k);
  ctx.strokeStyle = "#B9B7AF"; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
  if (upto > 0) {
    ctx.strokeStyle = "#5A3A1E"; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && cum[i] <= upto; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  const D = MALA_BEAD_UNITS, off = beadSprite(false), on = beadSprite(true);
  for (let b = 0; b < n; b++) {
    const x = mala.pos[b * 4], y = mala.pos[b * 4 + 1], tx = mala.pos[b * 4 + 2], ty = mala.pos[b * 4 + 3];
    const f = Math.max(0, Math.min(1, earned - b));
    ctx.drawImage(f >= 1 ? on : off, x - D / 2, y - D / 2, D, D);
    if (f > 0 && f < 1) {                                 // partial bead: earned colour fills from the "start" side along the thread
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty, tx));
      ctx.beginPath(); ctx.rect(-D / 2, -D / 2, D * f, D); ctx.clip(); ctx.rotate(-Math.atan2(ty, tx));
      ctx.drawImage(on, -D / 2, -D / 2, D, D); ctx.restore();
    }
  }
}

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

export function drawGeography(ctx, { geo, unlocked, temples = [], k = 1 }) {
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
  ctx.lineWidth = 1.3 / k; ctx.strokeStyle = PALETTE.indiaLine; ctx.globalAlpha = 0.75; ctx.lineJoin = "round"; ctx.stroke(P.outline); ctx.globalAlpha = 1;
  for (const id of open) {
    const f = geo.features[id]; if (!f || f.type !== "river") continue;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = 0.55; ctx.strokeStyle = PALETTE.riverSoft; ctx.lineWidth = 3.6 / Math.sqrt(k); ctx.stroke(P.features[id]);
    ctx.globalAlpha = 1; ctx.strokeStyle = PALETTE.river; ctx.lineWidth = 1.7 / Math.sqrt(k); ctx.stroke(P.features[id]);
  }
  for (const [x, y] of temples) {
    ctx.save(); ctx.translate(x, y); const s = 1 / Math.sqrt(k);
    ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(6, 6); ctx.lineTo(6, 2); ctx.lineTo(4, 2); ctx.lineTo(0, -6); ctx.lineTo(-4, 2); ctx.lineTo(-6, 2); ctx.closePath();
    ctx.fillStyle = PALETTE.temple; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.restore();
  }
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
