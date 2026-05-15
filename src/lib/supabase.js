export const SUPABASE_URL = "https://kurppksdakubwlwtimdh.supabase.co";
export const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cnBwa3NkYWt1Yndsd3RpbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Njc5MzYsImV4cCI6MjA5NDE0MzkzNn0.Vzdg4TcXWxKtr4h83OEMroXnfoRVLCk0YrjoWSHgiL0";

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
export const PARCHMENT = "#FFFDF5";

export const DEFAULT_LANG_ID   = "LANG_03";
export const DEFAULT_LANG_CODE = "eng";

export const logoUrl = "https://indiyatra.in/wp-content/uploads/2023/02/My-project.png";

export const LEVEL_LABELS = {
  LEVEL_001: { label: "Preparatory", classes: "Classes 3–5",  color: GREEN },
  LEVEL_003: { label: "Middle",      classes: "Classes 6–8",  color: HERITAGE },
  LEVEL_005: { label: "Secondary",   classes: "Classes 9–12", color: "#7B2D8B" },
};

export const VISIBILITY_BADGE = {
  PUBLIC:     { label: "Free",    bg: "#E8F5EE", color: GREEN },
  LOGGED_IN:  { label: "Sign in", bg: "#EEF4FF", color: HERITAGE },
  RESTRICTED: { label: "Premium", bg: "#FFF3E0", color: SAFFRON },
};

export const DIFFICULTY_STARS = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];
