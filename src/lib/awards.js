// src/lib/awards.js
// Read-only helpers for the forest token + badge system.
//
// 2.4 (roadmap): AWARDING MOVED SERVER-SIDE. Tokens and badges are granted by
// a DB trigger on lesson_completions INSERT — see
// supabase/phase2_server_awarding.sql §1 (fn_award_on_lesson_completion).
// Client INSERT policies on user_tokens / user_badges are revoked; the old
// awardForLessonComplete() is gone. The trigger mirrors its logic exactly:
//   dharma (qty = points, cap 1000) + tulsi per lesson · ashoka per module ·
//   lotus per theme(level-scoped) · peepal per level · banyan per course ·
//   BADGE_P02 first module · BADGE_P05 first course · BADGE_S02 7-day streak.
// Token types resolve from tokens.earn_trigger with the same defaults.

import { supabaseClient } from "./auth";

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
