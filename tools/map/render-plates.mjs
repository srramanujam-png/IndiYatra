#!/usr/bin/env node
// Pre-renders the 21 shared geography plates (0% + twenty 5% milestones) and their manifest.
//
//   npm run map:plates                       (reads tools/map/config/map-config.json)
//   node tools/map/render-plates.mjs --config path/to/map-config.json --out public/map/v1/plates
//
// A plate = regional land + faint relief + India outline + every mountain range unlocked up to that
// milestone. Rivers, temples, lawn, plants, mala and badges are NOT in the plates — they are drawn live (animated).
// Re-run this whenever milestone assignments, labels or temples change (Admin > Map shows a reminder).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const cfgPath = flag("--config", "tools/map/config/map-config.json");
const outDir = flag("--out", "public/map/v1/plates");
const geoDir = flag("--geo", "public/map/v1");
const only = flag("--only", null);           // e.g. --only 0,5,12  (quick previews)
const quality = Number(flag("--quality", 78));
const noRivers = !args.includes("--with-rivers");   // rivers + temples are drawn LIVE (animated); plates hold terrain + 3-D mountains only

// Config source: --from-db (published Supabase config = what Admin > Map edits; DEFAULT when .env exists)
// or a local JSON file made by `npm run map:config` (offline / first run).
async function loadConfig() {
  const wantDb = args.includes("--from-db");
  if (wantDb) {
    const env = Object.fromEntries((fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "").split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
    const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("--from-db needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (.env)");
    const res = await fetch(`${url}/rest/v1/rpc/get_map_config`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) throw new Error(`get_map_config failed: ${res.status} ${await res.text()}`);
    const c = await res.json();
    c.temples = c.temples.map((t) => ({ ...t, enabled: !!(t.enabled && t.lat !== null && t.lon !== null) }));
    return c;
  }
  return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
}
const cfg = await loadConfig();
const geo = JSON.parse(fs.readFileSync(path.join(geoDir, "geo.json"), "utf8"));
const hit = JSON.parse(fs.readFileSync(path.join(geoDir, "hit.json"), "utf8"));
const { W, H, lon0, lat1, cosLat } = geo.frame;
const U = 1000 / ((geo.frame.lon1 - lon0) * cosLat);
const project = (lon, lat) => [(lon - lon0) * cosLat * U, (lat1 - lat) * U];

export const PALETTE = {
  sea: "#E7ECEE", land: "#F8F7F2", coast: "#D6D3C6", relief: "#ECE7D8", reliefInk: "#BDB59B",
  india: "#F0EDE3", indiaLine: "#00509E", river: "#3F86C3", riverSoft: "#8DBBE0",
  snow: { fill: "#DCE7EF", line: "#8FA9BF" }, grassy: { fill: "#BFD0A0", line: "#8AA06A" },
  dry: { fill: "#E5D0A6", line: "#B9A06A" }, mixed: { fill: "#D2D3A8", line: "#9DA070" },
  temple: "#FF8E00",
};

function reliefPattern() {
  // small chevron "hills" — deterministic tile, clipped to relief polygons
  return `<pattern id="hills" width="14" height="12" patternUnits="userSpaceOnUse">
    <path d="M2 9 L5 4.5 L8 9 M8 6.5 L10.5 3 L13 6.5" fill="none" stroke="${PALETTE.reliefInk}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" opacity=".3"/></pattern>
  <pattern id="snowcap" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
    <path d="M0 5 H10" stroke="#fff" stroke-width="1.6" opacity=".7"/></pattern>`;
}

// 3-D peaks: lit left face, shaded right face, cast shadow, snow cap. Same recipe is mirrored in src/lib/map/drawMap.js.
export const PEAK = {
  snow:   { lit: "#B7C6D3", dark: "#7F93A6", cap: "#FFFFFF", capDark: "#D5E1EB", ink: "#6C8093" },
  grassy: { lit: "#A9BE86", dark: "#71875A", cap: null, ink: "#5F7449" },
  dry:    { lit: "#E0C994", dark: "#AD9358", cap: null, ink: "#8F7841" },
  mixed:  { lit: "#C5C994", dark: "#8D935F", cap: null, ink: "#767B4E" },
};
export function peakGeometry(x, y, w, style) {
  const h = w * (style === "snow" ? 1.18 : 0.9);
  const A = [x + 0.06 * w, y - h], L = [x - 0.5 * w, y], R = [x + 0.5 * w, y], M = [x + 0.1 * w, y + 0.07 * h];
  const sh = [R, [x + 0.5 * w + h * 0.55, y - 0.02 * h], [A[0] + h * 0.42, A[1] + h * 0.18]];   // shadow cast to the right
  const t = 0.34, cl = [A[0] + (L[0] - A[0]) * t, A[1] + (L[1] - A[1]) * t], cr = [A[0] + (R[0] - A[0]) * t, A[1] + (R[1] - A[1]) * t];
  const cm = [(cl[0] + cr[0]) / 2 + 0.03 * w, cl[1] + 0.09 * h];
  return { A, L, R, M, sh, cap: { cl, cr, cm }, w, h };
}
const f1 = (n) => n.toFixed(1), pt = (p) => `${f1(p[0])},${f1(p[1])}`;
function peakSvg(x, y, w, style) {
  const c = PEAK[style] || PEAK.mixed, g = peakGeometry(x, y, w, style);
  let o = `<path d="M${g.sh.map(pt).join("L")}Z" fill="#3b4a3a" opacity=".16"/>` +
    `<path d="M${pt(g.L)}L${pt(g.A)}L${pt(g.M)}Z" fill="${c.lit}"/><path d="M${pt(g.A)}L${pt(g.R)}L${pt(g.M)}Z" fill="${c.dark}"/>`;
  if (c.cap) o += `<path d="M${pt(g.A)}L${pt(g.cap.cl)}L${pt(g.cap.cm)}L${pt(g.cap.cr)}Z" fill="${c.cap}"/>` +
    `<path d="M${pt(g.A)}L${pt(g.cap.cm)}L${pt(g.cap.cr)}Z" fill="${c.capDark}"/>`;
  return o + `<path d="M${pt(g.L)}L${pt(g.A)}L${pt(g.R)}" fill="none" stroke="${c.ink}" stroke-width=".5" stroke-linejoin="round" opacity=".55"/>`;
}
function peaksSvg(f) {
  const a = f.peaks || [], o = [];
  for (let i = 0; i < a.length; i += 3) o.push(peakSvg(a[i] / 10, a[i + 1] / 10, (f.style === "snow" ? 21 : 17) * (a[i + 2] / 100), f.style));
  return o.join("");
}

function templeGlyph([x, y]) {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M-6 6 H6 V2 H4 L0 -6 L-4 2 H-6 Z" fill="${PALETTE.temple}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><circle cy="-7" r="1.4" fill="${PALETTE.temple}"/></g>`;
}

export function plateSvg(unlocked, temples) {
  const mountains = [], rivers = [];
  for (const id of unlocked) {
    const f = geo.features[id]; if (!f) continue;
    if (f.type === "mountain") {
      const st = PALETTE[f.style] || PALETTE.mixed;
      mountains.push(`<path d="${f.d}" fill="${st.fill}" stroke="${st.line}" stroke-width="1" stroke-linejoin="round" fill-opacity=".55"/>` + peaksSvg(f));
    } else if (!noRivers) rivers.push(`<path d="${f.d}" fill="none" stroke="${PALETTE.riverSoft}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>` +
      `<path d="${f.d}" fill="none" stroke="${PALETTE.river}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${reliefPattern()}<clipPath id="fr"><rect width="${W}" height="${H}"/></clipPath></defs>
  <rect width="${W}" height="${H}" fill="${PALETTE.sea}"/>
  <path d="${geo.land}" fill="${PALETTE.land}" stroke="${PALETTE.coast}" stroke-width=".8" fill-rule="evenodd"/>
  <path d="${geo.relief}" fill="${PALETTE.relief}" opacity=".4" fill-rule="evenodd"/>
  <path d="${geo.relief}" fill="url(#hills)" fill-rule="evenodd"/>
  ${mountains.join("\n  ")}
  <path d="${geo.outline.d}" fill="${PALETTE.india}" fill-opacity=".6" fill-rule="evenodd"/>
  <path d="${geo.outline.d}" fill="none" stroke="${PALETTE.indiaLine}" stroke-width="1" stroke-opacity=".45" stroke-linejoin="round" fill-rule="evenodd"/>
  ${rivers.join("\n  ")}
  ${noRivers ? "" : temples.map(templeGlyph).join("")}
  </svg>`;
}

// ----- cumulative unlock sets -----
const cumulative = [{ features: [], temples: [] }];
for (const m of cfg.milestones) {
  const prev = cumulative[cumulative.length - 1];
  cumulative.push({ features: [...prev.features, ...m.riverIds, ...m.mountainIds], temples: [...prev.temples, ...m.templeIds] });
}
const templeById = Object.fromEntries(cfg.temples.map((t) => [t.id, t]));
const placed = (id) => { const t = templeById[id]; return t && t.enabled ? project(t.lon, t.lat) : null; };

fs.mkdirSync(outDir, { recursive: true });
const wanted = only ? new Set(only.split(",").map(Number)) : null;
const sizes = [];
for (let i = 0; i <= 20; i++) {
  if (wanted && !wanted.has(i)) continue;
  const c = cumulative[i];
  const svg = plateSvg(c.features, c.temples.map(placed).filter(Boolean));
  const file = path.join(outDir, `${String(i).padStart(2, "0")}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality, effort: 6 }).toFile(file);
  sizes.push(fs.statSync(file).size);
}

// ----- manifest: everything the quick dashboard needs to label/hit-test, tied to THESE plates -----
const hotspots = {};
for (const [id, f] of Object.entries(cfg.features)) {
  const h = hit[id]; if (!h) continue;
  hotspots[id] = { type: f.type, name: f.name, hover: f.hover || f.name, tap: f.tap || `Explore the ${f.name}.`, style: f.style,
    kind: h.kind, anchor: h.anchor, parts: h.parts };
}
for (const t of cfg.temples) {
  const p = placed(t.id); if (!p) continue;
  hotspots[t.id] = { type: "temple", name: t.name, hover: t.hover || t.name, tap: t.tap || t.name, kind: "point", anchor: p.map((v) => +v.toFixed(1)), pts: [] };
}
const manifest = {
  configVersion: cfg.version, geoVersion: geo.version, provisionalGeography: !!geo.provisional,
  geographyNote: geo.outline.source, frame: geo.frame, plateFormat: "webp", plateCount: 21,
  builtAt: new Date().toISOString(),
  milestones: cfg.milestones.map((m, k) => ({ index: m.index, threshold: m.threshold, title: m.title,
    riverIds: m.riverIds, mountainIds: m.mountainIds, templeIds: m.templeIds.filter((id) => placed(id)),
    unlockedFeatureIds: [...cumulative[k + 1].features, ...cumulative[k + 1].temples.filter((id) => placed(id))] })),
  plantRules: cfg.plantRules, hotspots, attribution: geo.attribution,
};
if (!wanted) fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest));
const total = sizes.reduce((a, b) => a + b, 0);
console.log(`Rendered ${sizes.length} plate(s): avg ${(total / sizes.length / 1024).toFixed(1)} KB, max ${(Math.max(...sizes) / 1024).toFixed(1)} KB${wanted ? "" : ", manifest " + (JSON.stringify(manifest).length / 1024).toFixed(1) + " KB"}  [config ${cfg.version}${geo.provisional ? " · PROVISIONAL outline" : ""}]`);
