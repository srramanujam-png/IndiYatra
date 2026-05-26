// src/lib/awards.js
// Client-side token and badge awarding — called after every lesson completion.
// Phase II: migrate to a Supabase DB trigger on lesson_completions INSERT.

import { supabaseClient } from "./auth";

// ── Token-type map, loaded lazily from the tokens catalogue DB table ──────────
// Falls back to the hardcoded defaults if the DB is unavailable (e.g. offline).
const _DEFAULT_TRIGGER_MAP = {
  lesson: "tulsi",
  module: "ashoka",
  theme:  "lotus",
  level:  "peepal",
  course: "banyan",
};

let _triggerMapCache = null;          // null = not yet loaded
let _triggerMapLoadedAt = 0;          // epoch ms, cache expires after 5 min

/**
 * Returns { lesson: "tulsi", module: "ashoka", … } built from the tokens table
 * using the earn_trigger column.  Result is cached for 5 minutes.
 */
async function _getTriggerMap() {
  const now = Date.now();
  if (_triggerMapCache && now - _triggerMapLoadedAt < 5 * 60 * 1000) {
    return _triggerMapCache;
  }
  try {
    const { data, error } = await supabaseClient
      .from("tokens")
      .select("token_type, earn_trigger")
      .eq("is_active", true);
    if (error || !data || data.length === 0) throw new Error(error?.message || "empty");
    const map = {};
    for (const row of data) {
      if (row.earn_trigger && row.earn_trigger !== "points") {
        map[row.earn_trigger] = row.token_type;
      }
    }
    _triggerMapCache = map;
    _triggerMapLoadedAt = now;
    return map;
  } catch (e) {
    console.warn("[awards] Could not load token trigger map from DB, using defaults:", e.message);
    return _DEFAULT_TRIGGER_MAP;
  }
}

/**
 * Awards forest tokens and checks badge criteria after a lesson completes.
 *
 * @param {string} userId
 * @param {Array}  completedItems  — [{ type, name, id? }]
 *                   "lesson" always present; "module"/"theme"/"level"/"course"
 *                   added only when that tier was fully completed this session.
 * @param {number} points  — dharma points earned for this lesson
 * @returns {Promise<string[]>}  Newly earned badge_ids (empty array if none)
 */
export async function awardForLessonComplete(userId, completedItems, points) {
  if (!userId) return [];

  try {
    // ── 0. Deduplication guard ───────────────────────────────────────────────
    // If a tulsi token already exists for this lesson, it was already awarded.
    // This guards against re-completions and against the pre-fix duplicate runs.
    const lessonItem = completedItems.find(i => i.type === "lesson");
    if (lessonItem?.id) {
      const { data: existing } = await supabaseClient
        .from("user_tokens")
        .select("id")
        .eq("profile_id", userId)
        .eq("token_type", "tulsi")
        .eq("source_id", lessonItem.id)
        .limit(1);
      if (existing && existing.length > 0) {
        console.log("[awardForLessonComplete] Already awarded for lesson", lessonItem.id, "— skipping.");
        return [];
      }
    }

    // ── 1. Build token rows ──────────────────────────────────────────────────
    const tokenInserts = [];
    const triggerMap = await _getTriggerMap();

    // Dharma token — quantity = points earned this lesson (seed currency)
    if (points > 0) {
      const lessonItem = completedItems.find(i => i.type === "lesson");
      tokenInserts.push({
        profile_id: userId,
        token_type:  "dharma",
        quantity:    points,
        source_type: "lesson",
        source_id:   lessonItem?.id ?? null,
      });
    }

    // Plant tokens — one per completion tier
    for (const item of completedItems) {
      const tt = triggerMap[item.type];
      if (!tt) continue;
      tokenInserts.push({
        profile_id: userId,
        token_type:  tt,
        quantity:    1,
        source_type: item.type,
        source_id:   item.id ?? null,
      });
    }

    if (tokenInserts.length > 0) {
      const { error } = await supabaseClient.from("user_tokens").insert(tokenInserts);
      if (error) console.warn("user_tokens insert:", error.message);
    }

    // ── 2. Badge checks ──────────────────────────────────────────────────────
    const typesCompleted = new Set(completedItems.map(i => i.type));
    const candidateBadges = [];

    // Curiosity (BADGE_P02) — first module completed
    if (typesCompleted.has("module")) candidateBadges.push("BADGE_P02");

    // Endurance (BADGE_P05) — first course completed
    if (typesCompleted.has("course")) candidateBadges.push("BADGE_P05");

    // Persistence (BADGE_S02) — 7-day streak
    // Fetch last 8 days of completions to verify consecutive days
    const since = new Date(Date.now() - 8 * 86400000).toISOString();
    const { data: recent } = await supabaseClient
      .from("lesson_completions")
      .select("completed_at")
      .eq("profile_id", userId)
      .gte("completed_at", since);

    if (recent && recent.length > 0) {
      const activeDays = new Set(recent.map(c => c.completed_at.slice(0, 10)));
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (activeDays.has(d.toISOString().slice(0, 10))) { streak++; } else { break; }
      }
      if (streak >= 7) candidateBadges.push("BADGE_S02");
    }

    if (candidateBadges.length === 0) return [];

    // Filter out already-earned badges (UNIQUE constraint would reject them anyway,
    // but checking first avoids a round-trip error)
    const { data: alreadyEarned } = await supabaseClient
      .from("user_badges")
      .select("badge_id")
      .eq("profile_id", userId)
      .in("badge_id", candidateBadges);

    const earnedSet = new Set((alreadyEarned || []).map(b => b.badge_id));
    const newBadgeIds = candidateBadges.filter(id => !earnedSet.has(id));

    if (newBadgeIds.length > 0) {
      const { error } = await supabaseClient
        .from("user_badges")
        .insert(newBadgeIds.map(id => ({ profile_id: userId, badge_id: id })));
      if (error) console.warn("user_badges insert:", error.message);
    }

    return newBadgeIds;
  } catch (e) {
    console.warn("awardForLessonComplete:", e);
    return [];
  }
}

/**
 * Fetches the user's current forest token counts.
 * Returns { tulsi, ashoka, lotus, peepal, banyan, dharma }
 */
export async function loadForestTokens(userId) {
  if (!userId) return {};
  const { data, error } = await supabaseClient
    .from("user_tokens")
    .select("token_type, quantity")
    .eq("profile_id", userId);
  if (error || !data) return {};
  const totals = {};
  for (const row of data) {
    totals[row.token_type] = (totals[row.token_type] || 0) + (row.quantity || 1);
  }
  return totals;
}

/**
 * Fetches the user's earned badge_ids.
 * Returns Set<string>
 */
export async function loadEarnedBadges(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabaseClient
    .from("user_badges")
    .select("badge_id, awarded_at")
    .eq("profile_id", userId);
  if (error || !data) return new Set();
  return new Set(data.map(b => b.badge_id));
}
