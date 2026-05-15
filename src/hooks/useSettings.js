import { DEFAULT_LANG_ID, DEFAULT_LANG_CODE } from "../lib/supabase";

const STORAGE_KEY = "indiyatra_settings";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { languageId: DEFAULT_LANG_ID, languageCode: DEFAULT_LANG_CODE, fontSize: "md" };
}

export function saveSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}
