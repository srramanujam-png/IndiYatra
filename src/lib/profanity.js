// ─────────────────────────────────────────────────────────────────────────────
// Client-side profanity check (Roadmap 1.5 stopgap).
// MIRRORS supabase/phase1_comment_moderation.sql §1 — keep the two in sync.
// This gives users a friendly message BEFORE submitting; the database trigger
// (trg_comments_profanity) is the real enforcement and cannot be bypassed.
//
// Match modes:
//   word   — whole-word match (safe for short words like "gand")
//   substr — substring match (strings that can't appear in innocent words)
// 'bc'/'mc' deliberately absent: "300 BC" is everywhere in a history app.
// ─────────────────────────────────────────────────────────────────────────────

const WORD = [
  // English
  "shit", "bullshit", "bitch", "bastard", "asshole", "arsehole",
  "dick", "dickhead", "cock", "pussy", "cunt", "slut", "whore",
  "faggot", "fag", "retard", "retarded", "wanker",
  "porn", "nude", "nudes", "sexy", "rape", "rapist", "kys",
  // Hindi / Hinglish (romanized)
  "bsdk", "gandu", "gaandu", "gand", "gaand",
  "lund", "loda", "lauda", "lodu", "lawda",
  "chod", "chodu", "choda", "randi", "raand",
  "harami", "haramzada", "haramzade", "kamina", "kamine",
  "kutti", "tatti", "jhaant", "jhant", "bhadwa", "bhadwe",
  "hijra", "chakka",
];

const SUBSTR = [
  // English
  "fuck", "motherfucker", "nigger", "nigga", "kill yourself",
  // Hindi / Hinglish (romanized)
  "madarchod", "maderchod", "madharchod",
  "behenchod", "bhenchod", "behanchod",
  "bhosdike", "bhosdi", "bhosadike",
  "chutiya", "chutiye", "chutia",
];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };

function normalize(text) {
  const lowered = String(text).toLowerCase();
  let out = "";
  for (const ch of lowered) out += LEET[ch] ?? ch;
  return out;
}

/**
 * Returns true if the text contains blocked language.
 * Same normalisation as the DB trigger: lowercase → leet map → collapse
 * 3+ repeated letters ("fuuuuck" still matches).
 */
export function containsProfanity(text) {
  if (!text) return false;
  const norm = normalize(text);
  // "fuuuuck" → "fuck": collapse every repeated-letter run to a single letter.
  // Both variants are checked, so blocklist words with legit double letters
  // (e.g. "tatti") still match via `norm`.
  const collapsed = norm.replace(/(.)\1+/g, "$1");

  for (const w of SUBSTR) {
    if (norm.includes(w) || collapsed.includes(w)) return true;
  }
  for (const w of WORD) {
    const re = new RegExp(`\\b${w}\\b`);
    if (re.test(norm) || re.test(collapsed)) return true;
  }
  return false;
}

/** Friendly message shown when a comment is blocked (client or server). */
export const PROFANITY_MESSAGE =
  "Please keep comments kind and respectful — that language isn't allowed here.";
