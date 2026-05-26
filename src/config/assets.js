// ─────────────────────────────────────────────────────────────────────────────
// IndiYatra — Asset URLs
// Single source of truth for every image URL and external asset reference.
// logoUrl is kept in supabase.js for backward compat and re-exported here.
// ─────────────────────────────────────────────────────────────────────────────
export { logoUrl } from '../lib/supabase';

// ── Site URL ──────────────────────────────────────────────────────────────────
export const SITE_URL    = "https://indiyatra.in";
export const SITE_DOMAIN = "indiyatra.in";

// ── Open Graph image (update when a dedicated OG image is created) ────────────
export { logoUrl as OG_IMAGE_URL } from '../lib/supabase';
