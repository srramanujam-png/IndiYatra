// src/lib/map/mapMath.js
// Pure, DOM-free helpers for the India progress map. Everything here is deterministic so the same
// learner state always yields the same picture (plants never jump when another token is earned).

export const MILESTONES = 20;
export const STEP = 5; // percent per milestone

/** Clamp to [0,100]; non-finite → null (caller shows "no data", never a false 0%). */
export function normaliseProgress(p) {
  if (p === null || p === undefined || Number.isNaN(Number(p)) || !Number.isFinite(Number(p))) return null;
  return Math.min(100, Math.max(0, Number(p)));
}

/** Progress from raw dharma quantities. Mirrors public.get_map_state: awarded is clamped to possible;
 *  a missing/zero denominator returns null instead of 0. Integer-safe at 5% boundaries. */
export function progressFromDharma(awarded, possible) {
  if (!Number.isFinite(possible) || possible <= 0) return null;
  const a = Math.min(Math.max(0, Number(awarded) || 0), possible);
  return (100 * a) / possible;
}

/** Plate number / count of crossed thresholds. floor(p/5) for p<100, 20 at 100. A 1e-9 tolerance absorbs
 *  binary-float noise (0.3*100 = 29.999999999999996) without ever promoting a genuinely lower value
 *  (4.999999 stays at 0). The server (public.get_map_state) uses exact integer maths; the client
 *  normally just trusts the server's milestoneIndex and uses this for previews/tests. */
export function milestoneIndex(progress) {
  const p = normaliseProgress(progress);
  if (p === null) return 0;
  return Math.min(MILESTONES, Math.floor(p / STEP + 1e-9));
}

/** [1..k] — every threshold crossed (a jump 4%→16% yields [1,2,3]). */
export function crossedMilestones(progress) {
  return Array.from({ length: milestoneIndex(progress) }, (_, i) => i + 1);
}

/** Between two progress values: the thresholds that were newly crossed (for "unlocked!" toasts). */
export function newlyCrossed(prev, next) {
  const a = milestoneIndex(prev), b = milestoneIndex(next);
  return b > a ? Array.from({ length: b - a }, (_, i) => a + i + 1) : [];
}

export const plateFile = (index) => `${String(Math.min(MILESTONES, Math.max(0, index | 0))).padStart(2, "0")}.webp`;

/** Cumulative feature ids unlocked at `index`, from manifest.milestones (already cumulative). */
export function unlockedIds(manifest, index) {
  if (!manifest || index <= 0) return [];
  const m = manifest.milestones?.[Math.min(index, MILESTONES) - 1];
  return m ? m.unlockedFeatureIds : [];
}

// ─── growth: dharma seeds → dhruva grass, revealed south → north ────────────────────────────────────
/** Candidate list is pre-sorted south→north, so progress simply reveals a prefix. */
export function growthCount(progress, total) {
  const p = normaliseProgress(progress);
  if (p === null || total <= 0) return 0;
  return Math.min(total, Math.round((total * p) / 100));
}

/** A revealed candidate starts as a seed and matures into a grass tuft once progress has moved a little
 *  beyond it (or immediately at 100%). Returns { seeds:[i..], grass:[i..] }. */
export function growthStates(progress, total, maturity = 6) {
  const p = normaliseProgress(progress);
  const n = growthCount(p, total);
  const seeds = [], grass = [];
  for (let i = 0; i < n; i++) {
    const revealAt = (i / total) * 100;
    (p >= 100 || p >= revealAt + maturity ? grass : seeds).push(i);
  }
  return { seeds, grass };
}

// ─── plants: the nth token of a species always lands on its nth slot ─────────────────────────────────
const GOLDEN = 2.399963229728653;
/** Stable position for the nth plant. Beyond the pre-computed slots (a learner with more tokens than
 *  slots) positions wrap with a deterministic spiral offset, so extra plants stay near, never on top. */
export function plantPosition(slots, n) {
  const L = slots.length / 2;
  if (L === 0) return null;
  const k = Math.floor(n / L), i = n % L;
  const x = slots[i * 2], y = slots[i * 2 + 1];
  if (k === 0) return [x, y];
  const ang = k * GOLDEN, r = 5 + 3 * Math.sqrt(k);
  return [x + Math.cos(ang) * r * 10, y + Math.sin(ang) * r * 10];   // slots are stored ×10
}

/** Draw list for every earned plant, ordered so bigger/southern plants paint over smaller/northern ones. */
export function buildPlantList(plantCounts, candidates, rules, unit = 0.1) {
  const list = [];
  const byToken = Object.fromEntries((rules || []).map((r) => [r.tokenType, r]));
  for (const [token, count] of Object.entries(plantCounts || {})) {
    const rule = byToken[token];
    const slots = candidates?.plants?.[rule?.assetKey ?? token];
    if (!rule || !slots) continue;
    for (let n = 0; n < (count | 0); n++) {
      const p = plantPosition(slots, n);
      if (p) list.push({ key: rule.assetKey, x: p[0] * unit, y: p[1] * unit, scale: rule.scale, order: rule.order, n });
    }
  }
  list.sort((a, b) => a.order - b.order || a.y - b.y);
  return list;
}

/** Deterministic small hash → [0,1) for per-instance variation without storing anything. */
export function hash01(i, salt = 0) {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ─── hit testing (hover / tap on revealed features) ─────────────────────────────────────────────────
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function pairs(f) { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; }
function inPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Nearest revealed feature under (x,y) in MAP units. `tol` is the touch/hover slop in map units.
 *  Hidden (not unlocked) features never match — they have no hit target. */
export function hitTest(hotspots, unlocked, x, y, tol = 8) {
  const open = new Set(unlocked);
  let best = null, bestD = Infinity;
  for (const id of open) {
    const h = hotspots?.[id]; if (!h) continue;
    let d = Infinity;
    if (h.kind === "point") d = Math.hypot(x - h.anchor[0], y - h.anchor[1]) - 6;
    else if (h.parts) {                       // flat [x0,y0,x1,y1,…] arrays; rivers = every branch, ranges = each ring
      for (const f of h.parts) {
        if (h.kind === "line") { for (let i = 2; i < f.length; i += 2) d = Math.min(d, distToSegment(x, y, f[i - 2], f[i - 1], f[i], f[i + 1])); }
        else if (inPolygon(x, y, pairs(f))) { d = 0; break; }
      }
    }
    else if (h.kind === "line") { for (let i = 1; i < h.pts.length; i++) d = Math.min(d, distToSegment(x, y, ...h.pts[i - 1], ...h.pts[i])); }
    else if (h.kind === "poly") d = inPolygon(x, y, h.pts) ? 0 : Infinity;
    // polygons win ties only when nothing narrower (river/temple) is within tolerance
    const weight = h.kind === "poly" ? tol * 0.5 : 0;
    if (d <= tol && d + weight < bestD) { best = id; bestD = d + weight; }
  }
  return best;
}

// ─── layout ─────────────────────────────────────────────────────────────────────────────────────────
/** Badge ring layout by viewport: side columns on wide screens, compact strips above/below on phones. */
export function badgeLayout(count, viewportWidth) {
  const n = Math.min(12, Math.max(0, count | 0));
  const phone = viewportWidth < 700;
  const half = Math.ceil(n / 2);
  return phone
    ? { mode: "strips", size: viewportWidth < 380 ? 34 : 40, top: half, bottom: n - half, left: 0, right: 0 }
    : { mode: "columns", size: 52, top: 0, bottom: 0, left: half, right: n - half };
}

/** Screen px → map units, given the drawn rectangle of the map and the optional detail-view transform. */
export function toMapUnits(clientX, clientY, rect, frame, view = { k: 1, tx: 0, ty: 0 }) {
  const sx = frame.W / rect.width, sy = frame.H / rect.height;
  const mx = (clientX - rect.left) * sx, my = (clientY - rect.top) * sy;
  return [(mx - view.tx) / view.k, (my - view.ty) / view.k];
}

/** Human summary that is always shown next to the graphic (works without images / hover). */
export function summaryText(state, manifest, unlocked) {
  if (!state || state.status === "no_content") return "Your journey map will appear once courses have lessons to complete.";
  const pc = Number(state.progressPercent ?? 0);
  const pct = pc >= 99.995 ? "100" : pc.toFixed(pc % 1 === 0 ? 0 : 1);
  const names = (unlocked || []).map((id) => manifest?.hotspots?.[id]?.name).filter(Boolean);
  const plants = (manifest?.plantRules || []).slice().sort((a, b) => a.order - b.order)
    .map((r) => `${state.plantCounts?.[r.tokenType] ?? 0} ${r.species}`).join(", ");
  const earned = (state.badges || []).filter((b) => b.earned).length;
  return `${pct}% of your dharma seeds collected (${state.dharma?.awarded ?? 0} of ${state.dharma?.possible ?? 0}). ` +
    `Plants grown: ${plants}. ` +
    `${names.length ? `Unlocked: ${names.join(", ")}.` : "No rivers, mountain ranges or temples unlocked yet."} ` +
    `${earned} of ${(state.badges || []).length} badges earned.`;
}
