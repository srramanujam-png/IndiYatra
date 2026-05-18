import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./supabase";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:   true,  // store session in localStorage — survives page refresh
    autoRefreshToken: true,  // silently refresh JWT before it expires
    storageKey:       "indiyatra-auth",
  },
});

export async function signInWithProvider(provider) {
  return supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}

export async function signInWithEmail(email, password) {
  return supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  return supabaseClient.auth.signUp({ email, password });
}

export async function signOut() {
  return supabaseClient.auth.signOut({ scope: 'local' });
}

export async function signInAnonymously() {
  return supabaseClient.auth.signInAnonymously();
}

export async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function updateDisplayName(userId, displayName) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

// ─── Progress persistence ─────────────────────────────────────────────────────

export async function loadCompletions(userId) {
  const { data, error } = await supabaseClient
    .from("lesson_completions")
    .select("lesson_id, points_earned")
    .eq("profile_id", userId);
  return { data, error };
}

export async function saveCompletion(userId, lessonId, courseId, pointsEarned = 0, snippetCount = null) {
  const { data, error } = await supabaseClient
    .from("lesson_completions")
    .insert({
      profile_id: userId,
      lesson_id: lessonId,
      course_id: courseId,
      points_earned: pointsEarned,
      snippet_count: snippetCount,
      completed_at: new Date().toISOString(),
    });
  return { data, error };
}

// ─── Lesson progress (resume + snippet tracking) ──────────────────────────────

export async function loadLessonProgress(userId) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .select("lesson_id, snippet_index")
    .eq("profile_id", userId);
  return { data, error };
}

export async function upsertLessonProgress(userId, lessonId, snippetIndex) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .upsert(
      { profile_id: userId, lesson_id: lessonId, snippet_index: snippetIndex, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,lesson_id" }
    );
  return { data, error };
}

export async function deleteLessonProgress(userId, lessonId) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .delete()
    .eq("profile_id", userId)
    .eq("lesson_id", lessonId);
  return { data, error };
}

// ─── Snippet likes ───────────────────────────────────────────────────────────

export async function loadUserLikes(userId, snippetIds) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .select("snippet_id")
    .eq("profile_id", userId)
    .in("snippet_id", snippetIds);
  return { data, error };
}

export async function insertLike(userId, snippetId, courseId, themeId, moduleId, lessonId) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .insert({
      profile_id: userId,
      snippet_id: snippetId,
      course_id:  courseId  || null,
      theme_id:   themeId   || null,
      module_id:  moduleId  || null,
      lesson_id:  lessonId  || null,
      liked_at:   new Date().toISOString(),
    });
  return { data, error };
}

export async function deleteLike(userId, snippetId) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .delete()
    .eq("profile_id", userId)
    .eq("snippet_id", snippetId);
  return { data, error };
}

export async function updateLastVisited(userId, routeJson) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ last_visited_route: routeJson, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return { data, error };
}
