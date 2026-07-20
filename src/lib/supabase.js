export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

import { reportFetchError } from "./fetchStatus";

// 2.8 (A8/B3): failures no longer render as silent "no content". The helper
// still returns an array (so every `(rows || []).map` call site keeps
// working), but on failure the array is TAGGED with `.error` and the failure
// is broadcast on the fetchStatus bus, which App.jsx surfaces as a banner.
// Callers that want per-surface error UI can check `rows.error`.
export async function supabase(table, query = "") {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    // Network-level failure (offline, DNS, CORS)
    console.error(`Supabase network error on ${table}:`, e);
    reportFetchError({ source: "rest", status: 0, table, message: String(e?.message || e) });
    return Object.assign([], { error: { status: 0, table, message: "network" } });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Supabase error [${res.status}] on ${table}:`, err);
    reportFetchError({ source: "rest", status: res.status, table, message: err?.message || "" });
    return Object.assign([], { error: { status: res.status, table, message: err?.message || "" } });
  }
  return res.json();
}

// ─── Content thumbnails (module/lesson cover_image_url, story via snippet's
// own asset_library image) — batched by id, used anywhere a play-button
// circle needs a real photo behind it (currently ForYouPage's ItemRow).
// Returns { "module:<id>": url|null, "lesson:<id>": url|null, "story:<id>": url|null }
// — every requested id gets an entry (null when no image is set), so callers
// can distinguish "checked, no photo" from "not fetched yet".
export async function fetchContentThumbs({ moduleIds = [], lessonIds = [], storyIds = [] }) {
  const result = {};
  try {
    if (moduleIds.length) {
      moduleIds.forEach(id => { result["module:" + id] = null; });
      const rows = await supabase("modules", `?select=module_id,cover_image_url&module_id=in.(${moduleIds.join(",")})`);
      (rows || []).forEach(r => { if (r.cover_image_url) result["module:" + r.module_id] = r.cover_image_url; });
    }
    if (lessonIds.length) {
      lessonIds.forEach(id => { result["lesson:" + id] = null; });
      const rows = await supabase("lessons", `?select=lesson_id,cover_image_url&lesson_id=in.(${lessonIds.join(",")})`);
      (rows || []).forEach(r => { if (r.cover_image_url) result["lesson:" + r.lesson_id] = r.cover_image_url; });
    }
    if (storyIds.length) {
      storyIds.forEach(id => { result["story:" + id] = null; });
      const snips = await supabase("snippet_core", `?select=snippet_id,asset_id&snippet_id=in.(${storyIds.join(",")})`);
      const assetIds = [...new Set((snips || []).map(s => s.asset_id).filter(Boolean))];
      let fileById = {};
      if (assetIds.length) {
        const assets = await supabase("asset_library", `?select=asset_id,file_path&asset_id=in.(${assetIds.join(",")})`);
        (assets || []).forEach(a => { fileById[a.asset_id] = a.file_path; });
      }
      (snips || []).forEach(s => {
        if (s.asset_id && fileById[s.asset_id]) result["story:" + s.snippet_id] = fileById[s.asset_id];
      });
    }
  } catch (e) {
    console.warn("fetchContentThumbs:", e);
  }
  return result;
}

// ─── Shared constants ─────────────────────────────────────────────────────────
// JS MIRROR of the CSS tokens in src/index.css — kept as raw hex ONLY because
// some call sites concatenate alpha suffixes (`${SAFFRON}22`) or feed SVG
// presentation attributes, where CSS var() doesn't work. KEEP IN SYNC with
// index.css. In new code use var(--color-accent) etc. instead of these.
// Migration away from these constants lands with shared components (roadmap 3.6).
export const SAFFRON   = "#FF8E00";  // = var(--color-accent)
export const HERITAGE  = "#00509E";  // = var(--color-primary)
export const GREEN     = "#00924A";  // = var(--color-secondary)
export const PARCHMENT = "#FAFAF7"; // brand-compliant bright off-white

export const DEFAULT_LANG_ID   = "LANG_03";
export const DEFAULT_LANG_CODE = "eng";

export const logoUrl = "https://indiyatra.in/wp-content/uploads/2023/02/My-project.png";

export const LEVEL_LABELS = {
  LEVEL_001: { label: "Preparatory", classes: "Classes 3–5",  color: HERITAGE },
  LEVEL_002: { label: "Middle",      classes: "Classes 6–8",  color: HERITAGE },
  LEVEL_003: { label: "Secondary",   classes: "Classes 9–12", color: HERITAGE },
};

export const VISIBILITY_BADGE = {
  PUBLIC:     { label: "Free",    bg: "#FFFFFF", color: GREEN },
  LOGGED_IN:  { label: "Sign in", bg: "#FFFFFF", color: HERITAGE },
  RESTRICTED: { label: "Premium", bg: "#FFFFFF", color: SAFFRON },
};

export const DIFFICULTY_STARS = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];
// end
