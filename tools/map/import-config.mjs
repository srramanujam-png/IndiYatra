#!/usr/bin/env node
// Workbook -> validated map configuration (JSON + optional SQL seed).
//
//   node tools/map/import-config.mjs [workbook.xlsx] [--out tools/map/config/map-config.json] [--sql seed.sql]
//
// The workbook is AUTHORING INPUT only. The app never reads it at runtime.
// Runtime source of truth = the map_* tables (edited in Admin > Map); this script seeds them
// and produces a JSON file for offline plate generation.
import fs from "node:fs";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
XLSX.set_fs?.(fs);

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const book = args.find((a) => a.endsWith(".xlsx")) || "tools/map/config/India_LMS_Map_Configuration.xlsx";
const outJson = flag("--out") || "tools/map/config/map-config.json";
const outSql = flag("--sql");

// Token types as they exist in public.tokens AFTER migration 20260929000100 (jasmine/ashoka swap).
export const EVENT_TOKEN = { lesson: "tulsi", module: "jasmine", theme: "lotus", level: "ashoka", course: "banyan" };
export const EVENTS = Object.keys(EVENT_TOKEN);

const ids = (v) => String(v ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
const str = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());

function rows(wb, sheet, headerName) {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Missing sheet "${sheet}"`);
  const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const h = all.findIndex((r) => r && r.includes(headerName));
  if (h < 0) throw new Error(`Sheet "${sheet}": header "${headerName}" not found`);
  const head = all[h];
  return all.slice(h + 1).filter((r) => r && r.some((c) => c !== null && c !== "")).map((r) =>
    Object.fromEntries(head.map((k, i) => [k, r[i] ?? null])));
}

export function parseWorkbook(path) {
  const wb = XLSX.read(fs.readFileSync(path), { type: "buffer" });
  const features = {};
  for (const r of rows(wb, "Feature labels", "Feature ID")) {
    features[r["Feature ID"]] = {
      type: /river/i.test(r["Type"]) ? "river" : "mountain",
      name: str(r["Display name"]), hover: str(r["Hover label"]), tap: str(r["Tap card text"]),
      style: str(r["Style key"]) || "river",
    };
  }
  const temples = rows(wb, "Temples", "Temple ID").map((r) => ({
    id: r["Temple ID"], name: str(r["Site name"]),
    lat: r["Latitude"] === null ? null : Number(r["Latitude"]), lon: r["Longitude"] === null ? null : Number(r["Longitude"]),
    hover: str(r["Hover label"]), tap: str(r["Tap card text"]),
  }));
  const milestones = rows(wb, "Milestones", "Step").map((r) => ({
    index: Number(r["Step"]), threshold: Math.round(Number(r["Threshold"]) * 100),
    title: str(r["Title"]) || `Milestone ${r["Step"]}`,
    riverIds: ids(r["River IDs"]), mountainIds: ids(r["Mountain IDs"]), templeIds: ids(r["Temple IDs"]),
    note: str(r["Editorial note"]),
  }));
  const plantRules = rows(wb, "Plant rules", "Completion event").map((r) => ({
    event: String(r["Completion event"]).toLowerCase(), species: r["Plant"], assetKey: str(r["Asset key"]),
    order: Number(r["Display order"]), scale: Number(r["Relative scale"]), zone: str(r["Placement zone"]),
    tokenType: EVENT_TOKEN[String(r["Completion event"]).toLowerCase()],
  }));
  return { features, temples, milestones, plantRules };
}

export function validate(cfg, geoIds = null) {
  const errors = [];
  const { features, temples, milestones, plantRules } = cfg;
  if (milestones.length !== 20) errors.push(`Expected exactly 20 milestones, found ${milestones.length}`);
  milestones.forEach((m, i) => {
    if (m.index !== i + 1) errors.push(`Milestone row ${i + 1}: step must be ${i + 1} (got ${m.index})`);
    if (m.threshold !== 5 * (i + 1)) errors.push(`Milestone ${i + 1}: threshold must be ${5 * (i + 1)}% (got ${m.threshold}%)`);
    for (const id of [...m.riverIds, ...m.mountainIds]) if (!features[id]) errors.push(`Milestone ${m.index}: unknown feature "${id}"`);
    for (const id of m.templeIds) if (!temples.find((t) => t.id === id)) errors.push(`Milestone ${m.index}: unknown temple "${id}"`);
    if (!m.riverIds.length && !m.mountainIds.length && !m.templeIds.length) errors.push(`Milestone ${m.index}: needs at least one river, range or temple`);
  });
  for (const [id, f] of Object.entries(features)) {
    if (!f.name) errors.push(`Feature ${id}: missing display name`);
    if (geoIds && !geoIds.has(id)) errors.push(`Feature ${id}: no geometry in the geography bundle`);
  }
  // A feature must not be assigned to two milestones (it can only unlock once)
  const seen = new Map();
  for (const m of milestones) for (const id of [...m.riverIds, ...m.mountainIds, ...m.templeIds]) {
    if (seen.has(id)) errors.push(`"${id}" is assigned to milestones ${seen.get(id)} and ${m.index}`);
    else seen.set(id, m.index);
  }
  const tids = new Set();
  for (const t of temples) {
    if (tids.has(t.id)) errors.push(`Duplicate temple id ${t.id}`); tids.add(t.id);
    const hasLat = t.lat !== null && !Number.isNaN(t.lat), hasLon = t.lon !== null && !Number.isNaN(t.lon);
    if (hasLat !== hasLon) errors.push(`Temple ${t.id}: latitude and longitude must both be present or both empty`);
    if (hasLat && hasLon && (t.lat < 5 || t.lat > 38 || t.lon < 60 || t.lon > 100)) errors.push(`Temple ${t.id}: coordinates out of range`);
    if (hasLat && hasLon && !t.name) errors.push(`Temple ${t.id}: has coordinates but no name`);
  }
  for (const ev of EVENTS) if (!plantRules.find((p) => p.event === ev)) errors.push(`Plant rules: missing event "${ev}"`);
  return errors;
}

/** Temples with name + both coordinates are "published"; the rest stay editable slots, never placed. */
export function finalize(cfg) {
  cfg.temples = cfg.temples.map((t) => ({ ...t, enabled: !!(t.name && t.lat !== null && t.lon !== null && !Number.isNaN(t.lat) && !Number.isNaN(t.lon)) }));
  const body = JSON.stringify({ features: cfg.features, temples: cfg.temples, milestones: cfg.milestones, plantRules: cfg.plantRules });
  cfg.version = "cfg-" + crypto.createHash("sha1").update(body).digest("hex").slice(0, 10);
  return cfg;
}

const q = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
export function toSql(cfg) {
  const L = ["-- Generated by tools/map/import-config.mjs — seed for map_* tables. Safe to re-run."];
  for (const [id, f] of Object.entries(cfg.features))
    L.push(`INSERT INTO map_features (feature_id, feature_type, display_name, hover_label, tap_text, style_key) VALUES (${q(id)}, ${q(f.type)}, ${q(f.name)}, ${q(f.hover)}, ${q(f.tap)}, ${q(f.style)}) ON CONFLICT (feature_id) DO NOTHING;`);
  for (const t of cfg.temples)
    L.push(`INSERT INTO map_temples (temple_id, site_name, latitude, longitude, hover_label, tap_text, enabled) VALUES (${q(t.id)}, ${q(t.name)}, ${t.lat ?? "NULL"}, ${t.lon ?? "NULL"}, ${q(t.hover)}, ${q(t.tap)}, ${t.enabled}) ON CONFLICT (temple_id) DO NOTHING;`);
  for (const m of cfg.milestones) {
    L.push(`INSERT INTO map_milestones (milestone_index, threshold_percent, title, note) VALUES (${m.index}, ${m.threshold}, ${q(m.title)}, ${q(m.note)}) ON CONFLICT (milestone_index) DO NOTHING;`);
    for (const id of [...m.riverIds, ...m.mountainIds])
      L.push(`INSERT INTO map_milestone_features (milestone_index, feature_id) VALUES (${m.index}, ${q(id)}) ON CONFLICT DO NOTHING;`);
    for (const id of m.templeIds)
      L.push(`INSERT INTO map_milestone_temples (milestone_index, temple_id) VALUES (${m.index}, ${q(id)}) ON CONFLICT DO NOTHING;`);
  }
  for (const p of cfg.plantRules)
    L.push(`INSERT INTO map_plant_rules (event_type, token_type, species, asset_key, display_order, scale, placement_zone) VALUES (${q(p.event)}, ${q(p.tokenType)}, ${q(p.species)}, ${q(p.assetKey)}, ${p.order}, ${p.scale}, ${q(p.zone)}) ON CONFLICT (event_type) DO NOTHING;`);
  return L.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("import-config.mjs")) {
  const cfg = parseWorkbook(book);
  let geoIds = null;
  try { geoIds = new Set(Object.keys(JSON.parse(fs.readFileSync("public/map/v1/geo.json", "utf8")).features)); } catch { /* geo optional */ }
  const errors = validate(cfg, geoIds);
  if (errors.length) { console.error("Validation FAILED:\n - " + errors.join("\n - ")); process.exit(1); }
  finalize(cfg);
  fs.writeFileSync(outJson, JSON.stringify(cfg, null, 2));
  if (outSql) fs.writeFileSync(outSql, toSql(cfg));
  const live = cfg.temples.filter((t) => t.enabled).length;
  console.log(`OK  ${book}\n    ${cfg.milestones.length} milestones · ${Object.keys(cfg.features).length} features · ${live}/${cfg.temples.length} temples placed · config ${cfg.version}\n    wrote ${outJson}${outSql ? " + " + outSql : ""}`);
}
