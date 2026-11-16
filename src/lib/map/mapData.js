// src/lib/map/mapData.js
// Data access for the India progress map. Two kinds of data, kept apart on purpose:
//   • PERSONAL   — get_map_state() RPC (authenticated, RLS, derived from auth.uid()). One small request.
//   • SHARED ART — static, versioned files under /map/v1/ (cacheable on a CDN, identical for everyone).
// The quick dashboard loads: the state RPC + manifest + ONE plate + sprite atlas + placement slots.
// It never loads geo.json (vectors) or the other 20 plates.
import { supabaseClient } from "../auth";
import { plateFile } from "./mapMath";

const BASE = `${import.meta.env?.BASE_URL ?? "/"}map/v1/`;
export const mapAssetUrl = (name) => `${BASE}${name}`;

const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn().catch((e) => { memo.delete(key); throw e; })); return memo.get(key); };

/** Learner state for the whole platform (courseId omitted) or one course. */
export async function fetchMapState(courseId = null) {
  const { data, error } = await supabaseClient.rpc("get_map_state", { p_course_id: courseId });
  if (error) throw new Error(error.message || "Could not load your map");
  return data;
}

/** Progress-card data (last viewed, course %, next unlock in stories, next banyan). Never blocks the map: failures give null. */
export async function fetchMapCard(courseId = null) {
  try {
    const { data, error } = await supabaseClient.rpc("get_map_card", { p_course_id: courseId });
    return error ? null : data;
  } catch { return null; }
}

async function getJson(name, opts = {}) {
  const res = await fetch(mapAssetUrl(name), opts);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}
function getImage(url) {
  return new Promise((resolve, reject) => { const img = new Image(); img.decoding = "async"; img.onload = () => resolve(img); img.onerror = () => reject(new Error(`image failed: ${url}`)); img.src = url; });
}

/** Manifest = which features each plate contains + hover/tap text + hit shapes. Revalidated (ETag/304) so a
 *  plate regeneration is picked up without a hard refresh. */
export const loadManifest = () => once("manifest", () => getJson("plates/manifest.json", { cache: "no-cache" }));
export const loadIndia = () => once("india", () => getJson("india.json"));
export const loadCandidates = () => once("candidates", () => getJson("candidates.json"));
export const loadSprites = () => once("sprites", async () => {
  const [meta, atlas] = await Promise.all([getJson("sprites.json"), getImage(mapAssetUrl("sprites.webp"))]);
  return { ...meta, atlas };
});
/** The single plate for the learner's current milestone. `v` busts CDN caches when plates are regenerated. */
export const loadPlate = (index, version = "") => once(`plate:${index}:${version}`, () => getImage(`${BASE}plates/${plateFile(index)}${version ? `?v=${encodeURIComponent(version)}` : ""}`));
/** Detail view only. */
export const loadGeo = () => once("geo", () => getJson("geo.json"));

/** Everything the QUICK view needs, fetched in parallel. */
export async function loadQuickMap(state) {
  const manifest = await loadManifest();
  const [plate, sprites, candidates, india] = await Promise.all([loadPlate(state.milestoneIndex, `${manifest.configVersion}.${manifest.plateScale || 1}`), loadSprites(), loadCandidates(), loadIndia()]);
  return { manifest, plate, sprites, candidates, india };
}
