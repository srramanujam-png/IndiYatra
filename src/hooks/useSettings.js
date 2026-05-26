import { DEFAULT_LANG_ID, DEFAULT_LANG_CODE } from "../lib/supabase";

const STORAGE_KEY = "indiyatra_settings";

export const DEFAULT_SETTINGS = {
  languageId: DEFAULT_LANG_ID,
  languageCode: DEFAULT_LANG_CODE,
  languageName: 'English',
  fontSize: "md",
};

function storageKey(userId) {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

export function loadSettings(userId = null) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s, userId = null) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(s));
  } catch {}
}
