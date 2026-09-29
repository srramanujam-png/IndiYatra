// src/lib/map/drawMap.js
// Canvas renderer for the India progress map. One coordinate system everywhere: MAP UNITS
// (0..frame.W × 0..frame.H, 1000 wide). The same transform serves the pre-rendered plate, the
// dynamic layer, hit regions and labels, so nothing drifts on resize.
//
// quick view : plate <img> (from CDN) + THIS canvas draws only the dynamic vegetation
// detail    : this canvas also draws the vector geography (lazy-loaded geo.json) with pan/zoom
import { growthStates, hash01 } from "./mapMath";

export const SPRITE_UNITS = { seed: 9, grass: 21, plant: 26 };   // drawn width in map units (× rule scale for plants)

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
    ctx.globalAlpha = 0.92; ctx.fillStyle = fill; ctx.fill(P.features[id], "evenodd"); ctx.globalAlpha = 1;
    ctx.lineWidth = 1 / k; ctx.strokeStyle = line; ctx.lineJoin = "round"; ctx.stroke(P.features[id]);
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
