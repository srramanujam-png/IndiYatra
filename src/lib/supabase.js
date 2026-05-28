export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export async function supabase(table, query = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

// ─── Shared constants ─────────────────────────────────────────────────────────
export const SAFFRON   = "#FF8E00";
export const HERITAGE  = "#00509E";
export const GREEN     = "#00924A";
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
